import { afterEach, describe, expect, test } from "bun:test";
import { modalHeaders } from "./modal";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("modalHeaders", () => {
  test("includes proxy-auth token headers", () => {
    process.env.MODAL_PROXY_TOKEN_ID = "wk-id";
    process.env.MODAL_PROXY_TOKEN_SECRET = "ws-secret";
    expect(modalHeaders()).toEqual({
      "Content-Type": "application/json",
      "Modal-Key": "wk-id",
      "Modal-Secret": "ws-secret",
    });
  });

  test("throws when a token is missing", () => {
    delete process.env.MODAL_PROXY_TOKEN_ID;
    process.env.MODAL_PROXY_TOKEN_SECRET = "ws-secret";
    expect(() => modalHeaders()).toThrow(/MODAL_PROXY_TOKEN_ID/);
  });
});
