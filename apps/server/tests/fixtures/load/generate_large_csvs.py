from __future__ import annotations

import csv
import math
from datetime import date, timedelta
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent
ETF1_PATH = OUTPUT_DIR / "ETF1.csv"
ETF2_PATH = OUTPUT_DIR / "ETF2.csv"
PRICES_PATH = OUTPUT_DIR / "prices.csv"

SYMBOL_COUNT = 2400
ETF_SYMBOLS_PER_FILE = SYMBOL_COUNT // 2
PRICE_DAYS = 7200
START_DATE = date(2021, 1, 1)


def build_symbols() -> list[str]:
    """Return a deterministic symbol universe for the load fixtures."""
    return [f"SYM{index:04d}" for index in range(1, SYMBOL_COUNT + 1)]


def build_weights(symbols: list[str], offset: int) -> list[tuple[str, float]]:
    """Build stable ETF weights that sum to 1.0 after rounding."""
    raw_weights = [
        1000 + (((index + 1 + offset) * 37) % 400) for index in range(len(symbols))
    ]
    total_weight = sum(raw_weights)
    rounded_weights = [round(weight / total_weight, 8) for weight in raw_weights]
    rounded_weights[-1] = round(1.0 - sum(rounded_weights[:-1]), 8)
    return list(zip(symbols, rounded_weights, strict=True))


def write_weights_csv(path: Path, rows: list[tuple[str, float]]) -> None:
    """Write one ETF weights CSV fixture."""
    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["name", "weight"])
        writer.writerows((symbol, f"{weight:.8f}") for symbol, weight in rows)


def build_price(symbol_index: int, day_index: int) -> float:
    """Return a deterministic synthetic close price for one symbol and day."""
    base_price = 25 + (symbol_index * 0.47) + ((symbol_index % 11) * 1.9)
    drift = day_index * (0.035 + ((symbol_index % 5) * 0.004))
    wave = math.sin((day_index / 8.0) + (symbol_index * 0.31)) * (
        1.6 + ((symbol_index % 7) * 0.15)
    )
    seasonal = math.cos((day_index / 27.0) + (symbol_index * 0.09)) * 0.95
    return round(max(5.0, base_price + drift + wave + seasonal), 3)


def write_prices_csv(path: Path, symbols: list[str]) -> None:
    """Write the large synthetic historical prices fixture."""
    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["DATE", *symbols])
        for day_index in range(PRICE_DAYS):
            current_date = START_DATE + timedelta(days=day_index)
            row = [current_date.isoformat()]
            row.extend(
                f"{build_price(symbol_index, day_index):.3f}"
                for symbol_index in range(len(symbols))
            )
            writer.writerow(row)


def main() -> None:
    """Generate deterministic large CSV fixtures for backend load tests."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    symbols = build_symbols()
    etf1_symbols = symbols[:ETF_SYMBOLS_PER_FILE]
    etf2_symbols = symbols[ETF_SYMBOLS_PER_FILE:]

    write_weights_csv(ETF1_PATH, build_weights(etf1_symbols, offset=0))
    write_weights_csv(ETF2_PATH, build_weights(etf2_symbols, offset=ETF_SYMBOLS_PER_FILE))
    write_prices_csv(PRICES_PATH, symbols)

    print(f"Generated {ETF1_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Generated {ETF2_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Generated {PRICES_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Symbols: {SYMBOL_COUNT}")
    print(f"ETF rows per file: {ETF_SYMBOLS_PER_FILE}")
    print(f"Price rows: {PRICE_DAYS}")


if __name__ == "__main__":
    main()
