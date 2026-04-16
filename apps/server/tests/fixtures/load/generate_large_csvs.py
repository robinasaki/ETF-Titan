from __future__ import annotations

import csv
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent
ETF1_PATH = OUTPUT_DIR / "ETF1.csv"
ETF2_PATH = OUTPUT_DIR / "ETF2.csv"

SYMBOL_COUNT = 2400
ETF_SYMBOLS_PER_FILE = SYMBOL_COUNT // 2


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

def main() -> None:
    """Generate deterministic large CSV fixtures for backend load tests."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    symbols = build_symbols()
    etf1_symbols = symbols[:ETF_SYMBOLS_PER_FILE]
    etf2_symbols = symbols[ETF_SYMBOLS_PER_FILE:]

    write_weights_csv(ETF1_PATH, build_weights(etf1_symbols, offset=0))
    write_weights_csv(ETF2_PATH, build_weights(etf2_symbols, offset=ETF_SYMBOLS_PER_FILE))

    print(f"Generated {ETF1_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Generated {ETF2_PATH.relative_to(OUTPUT_DIR.parent.parent.parent)}")
    print(f"Symbols: {SYMBOL_COUNT}")
    print(f"ETF rows per file: {ETF_SYMBOLS_PER_FILE}")


if __name__ == "__main__":
    main()
