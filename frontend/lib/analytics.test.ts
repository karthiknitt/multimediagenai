import { describe, expect, test } from "bun:test";
import { fillDailySeries, parseRange, successRate } from "./analytics";

describe("parseRange", () => {
  test("accepts the supported ranges", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("90")).toBe(90);
  });
  test("falls back to 30 for anything else", () => {
    expect(parseRange(null)).toBe(30);
    expect(parseRange("1000")).toBe(30);
    expect(parseRange("abc")).toBe(30);
  });
});

describe("fillDailySeries", () => {
  const today = new Date("2026-10-03T10:00:00Z");
  test("zero-fills missing days and ends today", () => {
    const series = fillDailySeries([{ date: "2026-10-02", count: 3, cost: 0.5 }], 3, today);
    expect(series.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(series.map((p) => p.count)).toEqual([0, 3, 0]);
    expect(series[1].cost).toBe(0.5);
  });
  test("ignores rows outside the window", () => {
    const series = fillDailySeries([{ date: "2025-01-01", count: 9, cost: 9 }], 2, today);
    expect(series.every((p) => p.count === 0)).toBe(true);
  });
});

describe("successRate", () => {
  test("is null with no finished jobs", () => {
    expect(successRate(0, 0)).toBeNull();
  });
  test("is completed over finished", () => {
    expect(successRate(3, 1)).toBe(0.75);
  });
});
