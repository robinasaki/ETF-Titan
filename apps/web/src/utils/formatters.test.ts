import { describe } from "vitest";
import { it, expect } from "vitest";
import {
    formatDisplayDate,
    formatPercentage,
    formatUsdPrice,
    formatWeight,
    normalizeSymbol,
} from "./formatters";

/**
 * Validate shared formatter helpers.
 */
describe("formatters", () => {

    /**
     * Test 1: formatUsdPrice()
     */
    it("formats USD prices with fixed precision", () => {
        expect(formatUsdPrice(123.456789)).toBe("$123.457");
        expect(formatUsdPrice(100)).toBe("$100.000");
        expect(formatUsdPrice(0)).toBe("$0.000");
    });
    // The formatter shouldn't care about negative value. 
    // Negative values should be dealt with in validation layer.
    it("formats negative USD prices without throwing", () => {
        expect(formatUsdPrice(-12.3456)).toBe("$-12.346");
    });

    /**
     * Test 2: formatWeight()
     */
    it("formats weights with fixed precision", () => {
        expect(formatWeight(0.125678)).toBe("0.126");
        expect(formatWeight(10)).toBe("10.000");
        expect(formatWeight(0)).toBe("0.000");
    });

    it("formats decimal values as percentages", () => {
        expect(formatPercentage(0.125678)).toBe("12.568%");
        expect(formatPercentage(1)).toBe("100.000%");
        expect(formatPercentage(0)).toBe("0.000%");
    });

    /**
     * Test 3: normalizeSymbol()
     */
    it("normalizes symbols by trimming and uppercasing", () => {
        expect(normalizeSymbol("  spy  ")).toBe("SPY");
        expect(normalizeSymbol("vTi")).toBe("VTI");
        expect(normalizeSymbol(" brk.b ")).toBe("BRK.B");
    });

    /**
     * Test 4: formatDisplayDate()
     */
    it("returns display date unchanged", () => {
        expect(formatDisplayDate("2026-04-15")).toBe("2026-04-15");
        expect(formatDisplayDate("")).toBe("");
    });
});