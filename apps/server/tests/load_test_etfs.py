import asyncio
import logging
import math
import sys
import tempfile
import time
import unittest
from datetime import UTC, date, datetime, timedelta
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pandas as pd
from starlette.datastructures import Headers, UploadFile

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.repositories import csv_repository
from app.routers import etfs
from app.routers.etfs import upload_etf_analytics
from app.services import etf_service

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "load"
PRICE_DAYS = 7200
START_DATE = date(2021, 1, 1)

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

        self.etf2_frame = csv_repository.load_uploaded_etf_weights_frame(FIXTURE_DIR / "ETF2.csv")
        self.synthetic_prices_frame = self._build_large_prices_frame(
            self.etf2_frame["name"].tolist()
        )

        # Load tests override the bundled price loader with a synthetic in-memory frame.
        self.load_prices_patcher = patch.object(
            etf_service,
            "load_prices_frame",
            return_value=self.synthetic_prices_frame,
        )
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
        self.load_prices_patcher.start()
        self.temp_uploads_patcher.start()
        self.uploads_patcher.start()

        self.expected_holdings_count = len(self.etf2_frame)
        self.expected_price_rows = len(self.synthetic_prices_frame)
        self.expected_latest_date = self.synthetic_prices_frame.iloc[-1]["DATE"].date().isoformat()

    def tearDown(self) -> None:
        """Dispose of patched directories and temporary files."""
        self.load_prices_patcher.stop()
        self.temp_uploads_patcher.stop()
        self.uploads_patcher.stop()
        self.temp_dir.cleanup()

    def test_stage_csv_upload_writes_large_etf_fixture_across_small_chunks(self) -> None:
        """Ensure the staging helper can stream a large ETF weights CSV to disk."""
        fixture_path = FIXTURE_DIR / "ETF2.csv"
        fixture_size = fixture_path.stat().st_size

        with patch.object(etfs, "UPLOAD_READ_CHUNK_BYTES", 1024):
            staged_path = asyncio.run(
                etfs._stage_csv_upload(
                    upload=self._upload_fixture("ETF2.csv"),
                    label="ETF weights",
                    allowed_filenames=etfs.ALLOWED_ETF_UPLOAD_FILENAMES,
                )
            )

        logger.info("Large ETF fixture staged to %s", staged_path)
        self.assertEqual(staged_path.parent, self.temp_uploads_dir)
        self.assertEqual(staged_path.stat().st_size, fixture_size)

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

        self.assertEqual(response.etf_id, "ETF2")
        self.assertEqual(response.latest_date, self.expected_latest_date)
        self.assertEqual(len(response.holdings), self.expected_holdings_count)
        self.assertEqual(len(response.price_series), self.expected_price_rows)
        self.assertEqual(len(response.top_holdings), 5)
        self.assertTrue((self.uploads_dir / "ETF2.csv").exists())

    @staticmethod
    def _build_large_prices_frame(symbols: list[str]) -> pd.DataFrame:
        """Build a deterministic in-memory prices frame for the uploaded ETF symbols."""
        rows: list[dict[str, object]] = []
        for day_index in range(PRICE_DAYS):
            current_date = START_DATE + timedelta(days=day_index)
            row: dict[str, object] = {"DATE": pd.Timestamp(current_date)}
            for symbol_index, symbol in enumerate(symbols):
                row[symbol] = EtfLoadTests._build_price(symbol_index, day_index)
            rows.append(row)
        return pd.DataFrame(rows)

    @staticmethod
    def _build_price(symbol_index: int, day_index: int) -> float:
        """Return a deterministic synthetic close price for one symbol and day."""
        base_price = 25 + (symbol_index * 0.47) + ((symbol_index % 11) * 1.9)
        drift = day_index * (0.035 + ((symbol_index % 5) * 0.004))
        wave = math.sin((day_index / 8.0) + (symbol_index * 0.31)) * (
            1.6 + ((symbol_index % 7) * 0.15)
        )
        seasonal = math.cos((day_index / 27.0) + (symbol_index * 0.09)) * 0.95
        return round(max(5.0, base_price + drift + wave + seasonal), 3)

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
