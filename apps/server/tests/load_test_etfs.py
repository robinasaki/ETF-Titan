import asyncio
import logging
import sys
import tempfile
import time
import unittest
from datetime import datetime, UTC
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
        """Create isolated upload directories for load-oriented backend tests."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        self.temp_uploads_dir = self.temp_path / "tmp"
        self.uploads_dir = self.temp_path / "uploads"

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

        self.expected_holdings_counts = {
            "ETF1": len(csv_repository.load_uploaded_etf_weights_frame(FIXTURE_DIR / "ETF1.csv")),
            "ETF2": len(csv_repository.load_uploaded_etf_weights_frame(FIXTURE_DIR / "ETF2.csv")),
        }
        prices_frame = csv_repository.load_uploaded_prices_frame(FIXTURE_DIR / "prices.csv")
        self.expected_price_rows = len(prices_frame)
        self.expected_latest_date = prices_frame.iloc[-1]["DATE"].date().isoformat()

    def tearDown(self) -> None:
        """Dispose of patched directories and temporary files."""
        self.temp_uploads_patcher.stop()
        self.uploads_patcher.stop()
        self.temp_dir.cleanup()

    def test_stage_csv_upload_writes_large_prices_fixture_across_small_chunks(self) -> None:
        """Ensure the staging helper can stream a large prices CSV to disk."""
        fixture_path = FIXTURE_DIR / "prices.csv"
        fixture_size = fixture_path.stat().st_size

        with patch.object(etfs, "UPLOAD_READ_CHUNK_BYTES", 1024):
            staged_path = asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_fixture("prices.csv"),
                    label="prices",
                    allowed_filenames=etfs.ALLOWED_PRICES_UPLOAD_FILENAMES,
                )
            )

        logger.info("Large prices fixture staged to %s", staged_path)
        self.assertEqual(staged_path.parent, self.temp_uploads_dir)
        self.assertEqual(staged_path.stat().st_size, fixture_size)

    def test_upload_route_processes_large_fixture_bundle(self) -> None:
        """Ensure the upload route returns a full analytics bundle for large CSVs."""
        started_at = datetime.now(UTC)
        logger.info("Load test started at %s", started_at.isoformat())
        start_time = time.perf_counter()
        try:
            response = asyncio.run(
                upload_etf_analytics(
                    etf1_file=self._upload_fixture("ETF1.csv"),
                    etf2_file=self._upload_fixture("ETF2.csv"),
                    prices_file=self._upload_fixture("prices.csv"),
                    limit=5,
                )
            )
        finally:
            finished_at = datetime.now(UTC)
            elapsed_seconds = time.perf_counter() - start_time
            logger.info("Load test stopped at %s", finished_at.isoformat())
            logger.info("Large upload bundle processed in %.3fs", elapsed_seconds)

        self.assertEqual(response.source, "upload")
        self.assertEqual(response.prices_file_name, "prices.csv")
        self.assertEqual(response.top_holdings_limit, 5)
        self.assertEqual([item.etf_id for item in response.items], ["ETF1", "ETF2"])

        for item in response.items:
            self.assertEqual(item.latest_date, self.expected_latest_date)
            self.assertEqual(
                len(item.holdings),
                self.expected_holdings_counts[item.etf_id],
            )
            self.assertEqual(len(item.price_series), self.expected_price_rows)
            self.assertEqual(len(item.top_holdings), 5)

        self.assertTrue((self.uploads_dir / "ETF1.csv").exists())
        self.assertTrue((self.uploads_dir / "ETF2.csv").exists())
        self.assertTrue((self.uploads_dir / "prices.csv").exists())

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
