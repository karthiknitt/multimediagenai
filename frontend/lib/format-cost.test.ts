import { describe, expect, test } from "bun:test";
import { formatCostUsd } from "./format-cost";

describe("formatCostUsd", () => {
  test("returns null when no cost is recorded", () => {
    expect(formatCostUsd(null)).toBeNull();
    expect(formatCostUsd(undefined)).toBeNull();
    expect(formatCostUsd(Number.NaN)).toBeNull();
  });
  test("keeps precision for sub-cent amounts", () => {
    expect(formatCostUsd(0.00487)).toBe("$0.0049");
  });
  test("rounds to cents otherwise", () => {
    expect(formatCostUsd(0.0234)).toBe("$0.02");
    expect(formatCostUsd(1.5)).toBe("$1.50");
    expect(formatCostUsd(0)).toBe("$0.00");
  });
});
