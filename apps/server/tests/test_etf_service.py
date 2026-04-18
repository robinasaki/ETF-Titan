import logging
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.services import etf_service

logger = logging.getLogger("test_etf_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


class EtfServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        """Create temporary paths and common ETF fixture data for service tests."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        logger.info("Created temporary test directory at %s", self.temp_path)

        self.weights_frame = pd.DataFrame(
            [
                {"name": "AAPL", "weight": 0.6},
                {"name": "MSFT", "weight": 0.4},
            ]
        )
        self.prices_frame = pd.DataFrame(
            [
                {"DATE": pd.Timestamp("2024-01-01"), "AAPL": 100.0, "MSFT": 200.0},
                {"DATE": pd.Timestamp("2024-01-02"), "AAPL": 110.0, "MSFT": 210.0},
            ]
        )

    def tearDown(self) -> None:
        """Clean up temporary paths after each service test."""
        logger.info("Cleaning up temporary test directory at %s", self.temp_path)
        self.temp_dir.cleanup()

    def test_list_supported_etfs_returns_catalog_items_with_counts(self) -> None:
        """Ensure list_supported_etfs() returns one catalog item per supported ETF id."""
        with (
            patch.object(etf_service, "get_supported_etf_ids", return_value=("ETF1", "ETF2")),
            patch.object(
                etf_service,
                "load_etf_weights_frame",
                side_effect=[
                    pd.DataFrame([{"name": "AAPL", "weight": 1.0}]),
                    pd.DataFrame(
                        [
                            {"name": "MSFT", "weight": 0.5},
                            {"name": "NVDA", "weight": 0.5},
                        ]
                    ),
                ],
            ),
        ):
            response = etf_service.list_supported_etfs()

        self.assertEqual([item.id for item in response.items], ["ETF1", "ETF2"])
        self.assertEqual([item.constituent_count for item in response.items], [1, 2])

    def test_get_holdings_snapshot_returns_serialized_holdings(self) -> None:
        """Ensure get_holdings_snapshot() serializes the holdings DataFrame into response items."""
        holdings_frame = pd.DataFrame(
            [
                {
                    "name": "AAPL",
                    "weight": 0.6,
                    "latest_close": 110.0,
                    "latest_holding_value": 66.0,
                },
                {
                    "name": "MSFT",
                    "weight": 0.4,
                    "latest_close": 210.0,
                    "latest_holding_value": 84.0,
                },
            ]
        )

        with patch.object(
            etf_service,
            "_build_named_holdings_frame",
            return_value=("ETF1", "2024-01-02", holdings_frame, self.prices_frame),
        ):
            response = etf_service.get_holdings_snapshot("etf1")

        self.assertEqual(response.etf_id, "ETF1")
        self.assertEqual(response.latest_date, "2024-01-02")
        self.assertEqual([item.name for item in response.items], ["AAPL", "MSFT"])
        self.assertEqual([item.latest_holding_value for item in response.items], [66.0, 84.0])

    def test_get_holdings_snapshot_passes_as_of_to_named_holdings_builder(self) -> None:
        """Ensure get_holdings_snapshot() forwards as_of to the shared frame builder."""
        with patch.object(
            etf_service,
            "_build_named_holdings_frame",
            return_value=("ETF1", "2024-01-02", pd.DataFrame([]), self.prices_frame),
        ) as build_named_holdings_frame:
            etf_service.get_holdings_snapshot("ETF1", as_of="2024-01-01")

        build_named_holdings_frame.assert_called_once_with("ETF1", as_of="2024-01-01")

    def test_get_reconstructed_price_series_returns_weighted_points(self) -> None:
        """Ensure get_reconstructed_price_series() computes weighted ETF prices per date."""
        holdings_frame = pd.DataFrame(
            [
                {
                    "name": "AAPL",
                    "weight": 0.6,
                    "latest_close": 110.0,
                    "latest_holding_value": 66.0,
                },
                {
                    "name": "MSFT",
                    "weight": 0.4,
                    "latest_close": 210.0,
                    "latest_holding_value": 84.0,
                },
            ]
        )

        with patch.object(
            etf_service,
            "_build_named_holdings_frame",
            return_value=("ETF1", "2024-01-02", holdings_frame, self.prices_frame),
        ):
            response = etf_service.get_reconstructed_price_series("ETF1")

        self.assertEqual(response.etf_id, "ETF1")
        self.assertEqual(
            [(item.date, item.price) for item in response.items],
            [("2024-01-01", 140.0), ("2024-01-02", 150.0)],
        )

    def test_get_top_holdings_returns_ranked_subset(self) -> None:
        """Ensure get_top_holdings() returns only the highest-value holdings in ranked order."""
        holdings_frame = pd.DataFrame(
            [
                {
                    "name": "AAPL",
                    "weight": 0.4,
                    "latest_close": 200.0,
                    "latest_holding_value": 80.0,
                },
                {
                    "name": "MSFT",
                    "weight": 0.3,
                    "latest_close": 150.0,
                    "latest_holding_value": 45.0,
                },
                {
                    "name": "NVDA",
                    "weight": 0.3,
                    "latest_close": 100.0,
                    "latest_holding_value": 30.0,
                },
            ]
        )

        with patch.object(
            etf_service,
            "_build_named_holdings_frame",
            return_value=("ETF1", "2024-01-02", holdings_frame, self.prices_frame),
        ):
            response = etf_service.get_top_holdings("ETF1", limit=2)

        self.assertEqual(response.limit, 2)
        self.assertEqual([item.name for item in response.items], ["AAPL", "MSFT"])

    def test_get_top_holdings_passes_as_of_to_named_holdings_builder(self) -> None:
        """Ensure get_top_holdings() forwards as_of to the shared frame builder."""
        holdings_frame = pd.DataFrame(
            [
                {
                    "name": "AAPL",
                    "weight": 0.6,
                    "latest_close": 110.0,
                    "latest_holding_value": 66.0,
                }
            ]
        )
        with patch.object(
            etf_service,
            "_build_named_holdings_frame",
            return_value=("ETF1", "2024-01-02", holdings_frame, self.prices_frame),
        ) as build_named_holdings_frame:
            etf_service.get_top_holdings("ETF1", limit=5, as_of="2024-01-01")

        build_named_holdings_frame.assert_called_once_with("ETF1", as_of="2024-01-01")

    def test_build_holdings_frame_computes_latest_close_and_holding_value(self) -> None:
        """Ensure _build_holdings_frame() adds latest close and weighted holding value columns."""
        latest_date, holdings_frame, aligned_prices_frame = etf_service._build_holdings_frame(
            self.weights_frame,
            self.prices_frame,
        )

        self.assertEqual(latest_date, "2024-01-02")
        self.assertEqual(holdings_frame["latest_close"].tolist(), [110.0, 210.0])
        self.assertEqual(holdings_frame["latest_holding_value"].tolist(), [66.0, 84.0])
        pd.testing.assert_frame_equal(aligned_prices_frame, self.prices_frame)

    def test_build_holdings_frame_uses_as_of_date_when_provided(self) -> None:
        """Ensure _build_holdings_frame() computes snapshot values from as_of date."""
        latest_date, holdings_frame, aligned_prices_frame = etf_service._build_holdings_frame(
            self.weights_frame,
            self.prices_frame,
            as_of="2024-01-01",
        )

        self.assertEqual(latest_date, "2024-01-01")
        self.assertEqual(holdings_frame["latest_close"].tolist(), [100.0, 200.0])
        self.assertEqual(holdings_frame["latest_holding_value"].tolist(), [60.0, 80.0])
        pd.testing.assert_frame_equal(aligned_prices_frame, self.prices_frame)

    def test_build_holdings_frame_rejects_invalid_as_of_date(self) -> None:
        """Ensure _build_holdings_frame() rejects malformed as_of values."""
        with self.assertRaisesRegex(
            etf_service.InvalidAsOfDateError,
            "YYYY-MM-DD",
        ):
            etf_service._build_holdings_frame(
                self.weights_frame,
                self.prices_frame,
                as_of="2024/01/01",
            )

    def test_build_holdings_frame_rejects_as_of_date_not_in_prices(self) -> None:
        """Ensure _build_holdings_frame() rejects unavailable as_of dates."""
        with self.assertRaisesRegex(
            etf_service.InvalidAsOfDateError,
            "is unavailable",
        ):
            etf_service._build_holdings_frame(
                self.weights_frame,
                self.prices_frame,
                as_of="2024-01-03",
            )

    def test_build_holdings_frame_rejects_missing_price_symbols(self) -> None:
        """Ensure _build_holdings_frame() rejects ETF symbols missing from the prices data."""
        missing_symbol_weights = pd.DataFrame(
            [
                {"name": "AAPL", "weight": 0.5},
                {"name": "GOOGL", "weight": 0.5},
            ]
        )

        with self.assertRaisesRegex(
            etf_service.DatasetValidationError,
            "missing from prices data",
        ):
            etf_service._build_holdings_frame(missing_symbol_weights, self.prices_frame)

    def test_build_holdings_frame_rejects_weight_sum_outside_tolerance(self) -> None:
        """Ensure _build_holdings_frame() rejects ETF weights that do not sum near 1.0."""
        invalid_weights = pd.DataFrame(
            [
                {"name": "AAPL", "weight": 0.7},
                {"name": "MSFT", "weight": 0.2},
            ]
        )

        with self.assertRaisesRegex(
            etf_service.DatasetValidationError,
            "sum to approximately 1.0",
        ):
            etf_service._build_holdings_frame(invalid_weights, self.prices_frame)

    def test_build_named_holdings_frame_normalizes_etf_id_and_uses_default_loaders(self) -> None:
        """Ensure _build_named_holdings_frame() normalizes ids and delegates to default loaders."""
        with (
            patch.object(etf_service, "load_etf_weights_frame", return_value=self.weights_frame) as load_weights,
            patch.object(etf_service, "load_prices_frame", return_value=self.prices_frame) as load_prices,
        ):
            normalized_etf_id, latest_date, holdings_frame, prices_frame = (
                etf_service._build_named_holdings_frame(" etf1 ")
            )

        load_weights.assert_called_once_with("ETF1")
        load_prices.assert_called_once_with()
        self.assertEqual(normalized_etf_id, "ETF1")
        self.assertEqual(latest_date, "2024-01-02")
        self.assertEqual(holdings_frame["latest_holding_value"].tolist(), [66.0, 84.0])
        pd.testing.assert_frame_equal(prices_frame, self.prices_frame)

    def test_build_uploaded_etf_analytics_item_returns_combined_sections(self) -> None:
        """Ensure _build_uploaded_etf_analytics_item() returns holdings, price series, and top holdings."""
        staged_path = self.temp_path / "ETF1.csv"
        staged_path.write_text("name,weight\nAAPL,0.6\nMSFT,0.4\n", encoding="utf-8")
        logger.info("Created uploaded ETF fixture at %s", staged_path)

        with patch.object(
            etf_service,
            "load_uploaded_etf_weights_frame",
            return_value=self.weights_frame,
        ) as load_uploaded_weights:
            response = etf_service._build_uploaded_etf_analytics_item(
                etf_file_name="ETF1.csv",
                etf_staged_path=staged_path,
                prices_frame=self.prices_frame,
                top_holdings_limit=1,
            )

        load_uploaded_weights.assert_called_once_with(staged_path)
        self.assertEqual(response.etf_id, "ETF1")
        self.assertEqual(response.file_name, "ETF1.csv")
        self.assertEqual(response.latest_date, "2024-01-02")
        self.assertEqual([item.name for item in response.holdings], ["AAPL", "MSFT"])
        self.assertEqual(
            [(item.date, item.price) for item in response.price_series],
            [("2024-01-01", 140.0), ("2024-01-02", 150.0)],
        )
        self.assertEqual([item.name for item in response.top_holdings], ["MSFT"])

    def test_analyze_uploaded_etf_returns_item_and_persists_uploaded_file(self) -> None:
        """Ensure analyze_uploaded_etf() uses bundled prices and persists the ETF upload."""
        etf_path = self.temp_path / "staged-ETF1.csv"
        etf_path.write_text("fixture", encoding="utf-8")
        logger.info("Created staged upload fixture at %s", etf_path)

        uploaded_item = etf_service.UploadedEtfAnalyticsResponse(
            etf_id="ETF1",
            file_name="ETF1.csv",
            latest_date="2024-01-02",
            holdings=[],
            price_series=[],
            top_holdings=[],
        )

        with (
            patch.object(etf_service, "load_prices_frame", return_value=self.prices_frame) as load_prices,
            patch.object(
                etf_service,
                "_build_uploaded_etf_analytics_item",
                return_value=uploaded_item,
            ) as build_item,
            patch.object(etf_service, "persist_validated_upload") as persist_upload,
        ):
            response = etf_service.analyze_uploaded_etf(
                etf_file_name="ETF1.csv",
                etf_staged_path=etf_path,
                top_holdings_limit=2,
            )

        load_prices.assert_called_once_with()
        build_item.assert_called_once_with(
            etf_file_name="ETF1.csv",
            etf_staged_path=etf_path,
            prices_frame=self.prices_frame,
            top_holdings_limit=2,
        )
        persist_upload.assert_called_once_with(etf_path, "ETF1.csv")
        self.assertEqual(response.etf_id, "ETF1")

    def test_serialize_price_series_items_reconstructs_weighted_history(self) -> None:
        """Ensure _serialize_price_series_items() converts reconstructed ETF prices into response points."""
        holdings_frame = pd.DataFrame(
            [
                {"name": "AAPL", "weight": 0.6},
                {"name": "MSFT", "weight": 0.4},
            ]
        )

        items = etf_service._serialize_price_series_items(holdings_frame, self.prices_frame)

        self.assertEqual(
            [(item.date, item.price) for item in items],
            [("2024-01-01", 140.0), ("2024-01-02", 150.0)],
        )

    def test_serialize_top_holding_items_uses_value_weight_and_name_tiebreakers(self) -> None:
        """Ensure _serialize_top_holding_items() ranks by value, then weight, then name."""
        holdings_frame = pd.DataFrame(
            [
                {
                    "name": "MSFT",
                    "weight": 0.4,
                    "latest_close": 200.0,
                    "latest_holding_value": 80.0,
                },
                {
                    "name": "AAPL",
                    "weight": 0.4,
                    "latest_close": 200.0,
                    "latest_holding_value": 80.0,
                },
                {
                    "name": "NVDA",
                    "weight": 0.3,
                    "latest_close": 266.666667,
                    "latest_holding_value": 80.0,
                },
            ]
        )

        items = etf_service._serialize_top_holding_items(holdings_frame, limit=3)

        self.assertEqual([item.name for item in items], ["AAPL", "MSFT", "NVDA"])

    def test_round_number_returns_rounded_float(self) -> None:
        """Ensure _round_number() converts values to floats and rounds to the requested precision."""
        rounded = etf_service._round_number("1.23456789", digits=4)

        self.assertEqual(rounded, 1.2346)


if __name__ == "__main__":
    unittest.main()
