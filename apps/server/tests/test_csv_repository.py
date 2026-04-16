import logging
import sys
import tempfile
import unittest
from pathlib import Path
from types import MappingProxyType
from unittest.mock import patch

import pandas as pd

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.repositories import csv_repository

logger = logging.getLogger("test_csv_repository")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


class CsvRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        """Load the default CSVs. Create a temp test directory."""
        csv_repository.load_prices_frame.cache_clear()
        csv_repository.load_etf_weights_frame.cache_clear()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        logger.info("Created temporary test directory at %s", self.temp_path)

    def tearDown(self) -> None:
        """Clean up the temp test directory recursively."""
        csv_repository.load_prices_frame.cache_clear()
        csv_repository.load_etf_weights_frame.cache_clear()
        logger.info("Cleaning up temporary test directory at %s", self.temp_path)
        self.temp_dir.cleanup()

    def test_load_etf_weights_frame_normalizes_id_and_columns(self) -> None:
        """Check if load_etf_weights_frame() handles a default ETF CSV file even when the input is messy."""
        weights_path = self.temp_path / "ETF1.csv"
        weights_path.write_text(" Name , Weight \n aapl ,0.6\n msft,0.4\n", encoding="utf-8") # Write CSV content into tmp file
        logger.info("Wrote ETF weights fixture to %s", weights_path)

        # Temp replace csv_repository.ETF_DATA_FILES during the test
        with patch.object(
            csv_repository,
            "ETF_DATA_FILES",
            MappingProxyType({"ETF1": weights_path}),
        ):
            frame = csv_repository.load_etf_weights_frame(" etf1 ")

        expected = pd.DataFrame(
            [
                {"name": "AAPL", "weight": 0.6},
                {"name": "MSFT", "weight": 0.4},
            ]
        )
        pd.testing.assert_frame_equal(frame, expected)

    def test_load_etf_weights_frame_rejects_unknown_etf_id(self) -> None:
        """Ensure load_etf_weights_frame() rejects unknown etf ids."""
        with self.assertRaises(csv_repository.UnknownEtfError):
            csv_repository.load_etf_weights_frame("not-real")

    def test_load_prices_frame_sorts_dates_and_normalizes_symbols(self) -> None:
        """Test the date sort and symbol normalization of load_prices_frame()."""
        prices_path = self.temp_path / "prices.csv"
        prices_path.write_text(
            "DATE, aapl , msft \n"
            "2024-01-03,103,203\n"
            "2024-01-01,101,201\n"
            "2024-01-02,102,202\n",
            encoding="utf-8",
        )
        logger.info("Wrote prices fixture to %s", prices_path)

        with patch.object(csv_repository, "PRICES_FILE", prices_path):
            frame = csv_repository.load_prices_frame()

        self.assertEqual(list(frame.columns), ["DATE", "AAPL", "MSFT"])
        self.assertEqual(
            frame["DATE"].dt.strftime("%Y-%m-%d").tolist(),
            ["2024-01-01", "2024-01-02", "2024-01-03"],
        )
        self.assertEqual(frame["AAPL"].tolist(), [101, 102, 103])
        self.assertEqual(frame["MSFT"].tolist(), [201, 202, 203])

    def test_load_uploaded_etf_weights_frame_rejects_duplicate_symbols(self) -> None:
        """Ensure load_uploaded_etf_weights_frame() rejects duplicate symbols."""
        upload_path = self.temp_path / "upload.csv"
        upload_path.write_text("name,weight\naapl,0.6\nAAPL,0.4\n", encoding="utf-8")
        logger.info("Wrote duplicate-symbol upload fixture to %s", upload_path)

        with self.assertRaisesRegex(
            csv_repository.DatasetValidationError,
            "duplicate constituent symbols",
        ):
            csv_repository.load_uploaded_etf_weights_frame(upload_path)

    def test_load_uploaded_prices_frame_rejects_invalid_numeric_values(self) -> None:
        """Ensure load_uploaded_prices_frame() rejects invalid numeric price values."""
        upload_path = self.temp_path / "prices.csv"
        upload_path.write_text("DATE,AAPL\n2024-01-01,not-a-number\n", encoding="utf-8")
        logger.info("Wrote invalid-prices upload fixture to %s", upload_path)

        with self.assertRaisesRegex(
            csv_repository.DatasetValidationError,
            "invalid numeric values",
        ):
            csv_repository.load_uploaded_prices_frame(upload_path)

    def test_create_staged_upload_path_uses_safe_basename(self) -> None:
        """Ensure the staged uploaded directory creation function."""
        with patch.object(csv_repository, "TEMP_UPLOADS_DIR", self.temp_path / "tmp"):
            staged_path = csv_repository.create_staged_upload_path("../nested/prices.csv")

        self.assertEqual(staged_path.parent, self.temp_path / "tmp")
        self.assertEqual(staged_path.name.split("-", 1)[1], "prices.csv")
        self.assertTrue((self.temp_path / "tmp").is_dir())

    def test_cleanup_staged_upload_removes_existing_file(self) -> None:
        """Ensure you can remove the staged directory."""
        staged_path = self.temp_path / "staged.csv"
        staged_path.write_text("name,weight\nAAPL,1.0\n", encoding="utf-8")
        logger.info("Created staged upload fixture at %s", staged_path)

        csv_repository.cleanup_staged_upload(staged_path)

        self.assertFalse(staged_path.exists())

    def test_persist_validated_upload_moves_file_with_safe_basename(self) -> None:
        """Test the stage -> persistent CSV move."""
        staged_path = self.temp_path / "staged.csv"
        staged_path.write_text("name,weight\nAAPL,1.0\n", encoding="utf-8")
        logger.info("Created staged upload fixture at %s", staged_path)

        with patch.object(csv_repository, "UPLOADS_DIR", self.temp_path / "uploads"):
            stored_path = csv_repository.persist_validated_upload(
                staged_path,
                "../../ETF1.csv",
            )
        logger.info("Validated upload moved to %s", stored_path)

        self.assertEqual(stored_path, self.temp_path / "uploads" / "ETF1.csv")
        self.assertTrue(stored_path.exists())
        self.assertFalse(staged_path.exists())


if __name__ == "__main__":
    unittest.main()
