import { describe, expect, test } from "bun:test";
import { isAllowedMediaUrl } from "./media-url";

const base = "https://pub-abc123.r2.dev";

describe("isAllowedMediaUrl", () => {
  test("accepts an object under the configured public base", () => {
    expect(isAllowedMediaUrl(`${base}/images/2026-10-03/x.png`, base)).toBe(true);
  });

  test("rejects the substring bypass", () => {
    expect(isAllowedMediaUrl("https://evil.com/?.r2.dev", base)).toBe(false);
    expect(isAllowedMediaUrl("https://pub-abc123.r2.dev.evil.com/x.png", base)).toBe(false);
  });

  test("rejects userinfo tricks", () => {
    expect(isAllowedMediaUrl("https://pub-abc123.r2.dev@evil.com/x.png", base)).toBe(false);
  });

  test("rejects non-https and different ports", () => {
    expect(isAllowedMediaUrl("http://pub-abc123.r2.dev/x.png", base)).toBe(false);
    expect(isAllowedMediaUrl("https://pub-abc123.r2.dev:8443/x.png", base)).toBe(false);
  });

  test("rejects malformed input and missing base", () => {
    expect(isAllowedMediaUrl("not a url", base)).toBe(false);
    expect(isAllowedMediaUrl(`${base}/x.png`, undefined)).toBe(false);
    expect(isAllowedMediaUrl(`${base}/x.png`, "")).toBe(false);
  });
});
