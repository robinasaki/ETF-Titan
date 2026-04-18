import asyncio
import logging
import sys
import time
import unittest
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from starlette.datastructures import Headers, UploadFile

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.repositories import csv_repository
from app.routers import etfs
from app.routers.etfs import upload_etf_analytics

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "load"

logger = logging.getLogger("load_test_etfs")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


class EtfLoadTests(unittest.TestCase):
    def setUp(self) -> None:
        """Use real storage so successful load uploads remain on disk."""

        self.etf2_frame = csv_repository.load_uploaded_etf_weights_frame(FIXTURE_DIR / "ETF2.csv")
        self.prices_frame = csv_repository.load_prices_frame()

        self.expected_holdings_count = len(self.etf2_frame)
        self.expected_price_rows = len(self.prices_frame)
        self.expected_latest_date = self.prices_frame.iloc[-1]["DATE"].date().isoformat()
        self.upload_count_before = len(csv_repository.list_uploaded_etf_files())

    def tearDown(self) -> None:
        """Uploaded load files are kept intentionally."""

    def test_stage_csv_upload_writes_large_etf_fixture_across_small_chunks(self) -> None:
        """Ensure the staging helper can stream a large ETF weights CSV to disk."""
        fixture_path = FIXTURE_DIR / "ETF2.csv"
        fixture_size = fixture_path.stat().st_size

        with patch.object(etfs, "UPLOAD_READ_CHUNK_BYTES", 1024):
            staged_path = asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_fixture("ETF2.csv"),
                    label="ETF weights",
                )
            )

        logger.info("Large ETF fixture staged to %s", staged_path)
        self.assertEqual(staged_path.parent, csv_repository.TEMP_UPLOADS_DIR)
        self.assertEqual(staged_path.stat().st_size, fixture_size)
        csv_repository.cleanup_staged_upload(staged_path)

    def test_upload_route_processes_large_etf_fixture(self) -> None:
        """Ensure the upload route returns a full analytics response for a large ETF CSV."""
        started_at = datetime.now(UTC)
        logger.info("Load test started at %s", started_at.isoformat())
        start_time = time.perf_counter()
        try:
            response = asyncio.run(
                upload_etf_analytics(
                    etf_file=self._upload_fixture("ETF2.csv"),
                    limit=5,
                )
            )
        finally:
            finished_at = datetime.now(UTC)
            elapsed_seconds = time.perf_counter() - start_time
            logger.info("Load test stopped at %s", finished_at.isoformat())
            logger.info("Large ETF upload processed in %.3fs", elapsed_seconds)

        self.assertRegex(response.etf_id, r"^ETF\d+$")
        self.assertEqual(response.latest_date, self.expected_latest_date)
        self.assertEqual(len(response.holdings), self.expected_holdings_count)
        self.assertEqual(len(response.price_series), self.expected_price_rows)
        self.assertEqual(len(response.top_holdings), 5)
        self.assertTrue((csv_repository.UPLOADS_DIR / response.file_name).exists())
        self.assertEqual(len(csv_repository.list_uploaded_etf_files()), self.upload_count_before + 1)

    @staticmethod
    def _upload_fixture(filename: str) -> UploadFile:
        """Build an in-memory UploadFile from one load fixture."""
        fixture_path = FIXTURE_DIR / filename
        return UploadFile(
            file=BytesIO(fixture_path.read_bytes()),
            filename=filename,
            headers=Headers({"content-type": "text/csv"}),
        )


if __name__ == "__main__":
    unittest.main()
