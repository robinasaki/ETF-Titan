from __future__ import annotations

import csv
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent
ETF1_PATH = OUTPUT_DIR / "ETF1.csv"
ETF2_PATH = OUTPUT_DIR / "ETF2.csv"
PRICES_CSV_PATH = OUTPUT_DIR.parents[2] / "storage" / "prices" / "prices.csv"


def read_price_symbols() -> list[str]:
    """Read the bundled prices header and return all constituent symbols."""
    with PRICES_CSV_PATH.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.reader(csv_file)
        header = next(reader, [])

    if not header or header[0].strip().upper() != "DATE":
        raise ValueError("prices.csv must contain a DATE column as the first header.")

    symbols = [column.strip().upper() for column in header[1:] if column.strip()]
    if not symbols:
        raise ValueError("prices.csv must contain at least one constituent symbol column.")
    return symbols


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

def main() -> None:
    """Generate deterministic max-valid CSV fixtures for backend load tests."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    symbols = read_price_symbols()
    midpoint = max(1, len(symbols) // 2)
    etf1_symbols = symbols[:midpoint]
    etf2_symbols = symbols

    write_weights_csv(ETF1_PATH, build_weights(etf1_symbols, offset=0))
    write_weights_csv(ETF2_PATH, build_weights(etf2_symbols, offset=midpoint))

    print(f"Generated {ETF1_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Generated {ETF2_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Bundled price symbols: {len(symbols)}")
    print(f"ETF1 rows: {len(etf1_symbols)}")
    print(f"ETF2 rows (max valid): {len(etf2_symbols)}")


if __name__ == "__main__":
    main()
