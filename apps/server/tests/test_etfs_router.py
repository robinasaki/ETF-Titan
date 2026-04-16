import asyncio
import logging
import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.repositories import csv_repository
from app.main import app
from app.routers import etfs
from app.routers.etfs import upload_etf_analytics

logger = logging.getLogger("test_etfs_router")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


class EtfUploadRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        """Create temporary upload directories and patch repository storage paths."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        self.temp_uploads_dir = self.temp_path / "tmp"
        self.uploads_dir = self.temp_path / "uploads"
        logger.info("Created temporary test directory at %s", self.temp_path)

        self.temp_uploads_patcher = patch.object(
            csv_repository,
            "TEMP_UPLOADS_DIR",
            self.temp_uploads_dir,
        )
        self.uploads_patcher = patch.object(
            csv_repository,
            "UPLOADS_DIR",
            self.uploads_dir,
        )
        self.temp_uploads_patcher.start()
        self.uploads_patcher.start()

    def tearDown(self) -> None:
        """Remove temporary upload directories after each test."""
        self.temp_uploads_patcher.stop()
        self.uploads_patcher.stop()
        logger.info("Cleaning up temporary test directory at %s", self.temp_path)
        self.temp_dir.cleanup()

    def test_upload_route_schema_requires_all_three_files(self) -> None:
        """Ensure the upload route schema marks ETF1, ETF2, and prices as required."""
        openapi_schema = app.openapi()
        request_body = openapi_schema["paths"]["/etfs/upload"]["post"]["requestBody"]
        schema_ref = request_body["content"]["multipart/form-data"]["schema"]["$ref"]
        schema_name = schema_ref.rsplit("/", 1)[-1]
        multipart_schema = openapi_schema["components"]["schemas"][schema_name]

        self.assertCountEqual(
            multipart_schema["required"],
            ["etf1_file", "etf2_file", "prices_file"],
        )

    def test_handle_service_call_maps_unknown_etf_to_404(self) -> None:
        """Ensure _handle_service_call() converts UnknownEtfError into HTTP 404."""
        with self.assertRaises(HTTPException) as captured:
            etfs._handle_service_call(
                lambda: (_ for _ in ()).throw(csv_repository.UnknownEtfError("missing"))
            )

        self.assertEqual(captured.exception.status_code, 404)
        self.assertEqual(captured.exception.detail, "ETF id is not supported.")

    def test_handle_service_call_maps_dataset_validation_to_500(self) -> None:
        """Ensure _handle_service_call() converts DatasetValidationError into HTTP 500."""
        with self.assertRaises(HTTPException) as captured:
            etfs._handle_service_call(
                lambda: (_ for _ in ()).throw(
                    csv_repository.DatasetValidationError("broken bundled data")
                )
            )

        self.assertEqual(captured.exception.status_code, 500)
        self.assertEqual(
            captured.exception.detail,
            "Bundled ETF data failed validation.",
        )

    def test_handle_upload_call_maps_dataset_validation_to_422(self) -> None:
        """Ensure _handle_upload_call() converts upload validation errors into HTTP 422."""
        with self.assertRaises(HTTPException) as captured:
            etfs._handle_upload_call(
                lambda: (_ for _ in ()).throw(
                    csv_repository.DatasetValidationError("bad upload")
                )
            )

        self.assertEqual(captured.exception.status_code, 422)
        self.assertEqual(captured.exception.detail, "bad upload")

    def test_stage_csv_upload_rejects_non_csv_extension(self) -> None:
        """Ensure _stage_csv_upload() rejects non-CSV filenames."""
        with self.assertRaises(HTTPException) as captured:
            asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_file("ETF1.txt", "name,weight\nAAPL,1.0\n"),
                    label="ETF weights",
                    allowed_filenames=frozenset({"ETF1.csv"}),
                )
            )

        self.assertEqual(captured.exception.status_code, 415)
        self.assertEqual(
            captured.exception.detail,
            "ETF weights upload must be a .csv file.",
        )

    def test_stage_csv_upload_rejects_invalid_filename(self) -> None:
        """Ensure _stage_csv_upload() rejects disallowed filenames."""
        with self.assertRaises(HTTPException) as captured:
            asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_file("custom.csv", "name,weight\nAAPL,1.0\n"),
                    label="ETF weights",
                    allowed_filenames=frozenset({"ETF1.csv"}),
                )
            )

        self.assertEqual(captured.exception.status_code, 422)
        self.assertEqual(
            captured.exception.detail,
            "ETF weights upload must be named one of: ETF1.csv.",
        )

    def test_stage_csv_upload_rejects_invalid_content_type(self) -> None:
        """Ensure _stage_csv_upload() rejects unsupported upload content types."""
        with self.assertRaises(HTTPException) as captured:
            asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_file(
                        "ETF1.csv",
                        "name,weight\nAAPL,1.0\n",
                        content_type="application/json",
                    ),
                    label="ETF weights",
                    allowed_filenames=frozenset({"ETF1.csv"}),
                )
            )

        self.assertEqual(captured.exception.status_code, 415)
        self.assertEqual(
            captured.exception.detail,
            "ETF weights upload must use a CSV content type.",
        )

    def test_stage_csv_upload_rejects_empty_upload(self) -> None:
        """Ensure _stage_csv_upload() rejects empty CSV uploads."""
        with self.assertRaises(HTTPException) as captured:
            asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_file("ETF1.csv", ""),
                    label="ETF weights",
                    allowed_filenames=frozenset({"ETF1.csv"}),
                )
            )

        self.assertEqual(captured.exception.status_code, 422)
        self.assertEqual(captured.exception.detail, "ETF weights upload is empty.")

    def test_stage_csv_upload_writes_expected_file_contents(self) -> None:
        """Ensure _stage_csv_upload() writes the incoming CSV bytes to disk."""
        csv_content = "name,weight\nAAPL,1.0\n"
        staged_path = asyncio.run(
            etfs._stage_csv_upload(
                upload=self._upload_file("ETF1.csv", csv_content),
                label="ETF weights",
                allowed_filenames=frozenset({"ETF1.csv"}),
            )
        )
        logger.info("Staged upload created at %s", staged_path)

        self.assertEqual(staged_path.parent, self.temp_uploads_dir)
        self.assertEqual(staged_path.read_text(encoding="utf-8"), csv_content)

    def test_upload_route_rejects_wrong_etf_filename(self) -> None:
        """Ensure upload_etf_analytics() rejects a bundle with a wrong ETF filename."""
        with self.assertRaises(HTTPException) as captured:
            asyncio.run(
                upload_etf_analytics(
                    etf1_file=self._upload_file("ETF1.csv", "name,weight\nAAPL,1.0\n"),
                    etf2_file=self._upload_file("custom.csv", "name,weight\nMSFT,1.0\n"),
                    prices_file=self._upload_file(
                        "prices.csv",
                        "DATE,AAPL,MSFT\n2024-01-01,100,200\n2024-01-02,101,201\n",
                    ),
                    limit=1,
                )
            )

        self.assertEqual(captured.exception.status_code, 422)
        self.assertEqual(
            captured.exception.detail,
            "ETF weights upload must be named one of: ETF2.csv.",
        )

    def test_upload_route_returns_bundle_response_for_all_three_files(self) -> None:
        """Ensure upload_etf_analytics() returns a persisted bundle response on success."""
        response = asyncio.run(
            upload_etf_analytics(
                etf1_file=self._upload_file("ETF1.csv", "name,weight\nAAPL,1.0\n"),
                etf2_file=self._upload_file("ETF2.csv", "name,weight\nMSFT,1.0\n"),
                prices_file=self._upload_file(
                    "prices.csv",
                    "DATE,AAPL,MSFT\n2024-01-01,100,200\n2024-01-02,101,201\n",
                ),
                limit=1,
            )
        )

        self.assertEqual(response.source, "upload")
        self.assertEqual(response.prices_file_name, "prices.csv")
        self.assertEqual(response.top_holdings_limit, 1)
        self.assertEqual([item.etf_id for item in response.items], ["ETF1", "ETF2"])
        self.assertEqual(
            [item.file_name for item in response.items],
            ["ETF1.csv", "ETF2.csv"],
        )
        self.assertTrue((self.uploads_dir / "ETF1.csv").exists())
        self.assertTrue((self.uploads_dir / "ETF2.csv").exists())
        self.assertTrue((self.uploads_dir / "prices.csv").exists())

    @staticmethod
    def _upload_file(
        filename: str,
        content: str,
        content_type: str = "text/csv",
    ) -> UploadFile:
        """Build an in-memory UploadFile for router unit tests."""
        return UploadFile(
            file=BytesIO(content.encode("utf-8")),
            filename=filename,
            headers=Headers({"content-type": content_type}),
        )


if __name__ == "__main__":
    unittest.main()
