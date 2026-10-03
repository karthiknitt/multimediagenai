import { describe, expect, mock, test } from "bun:test";
import { dispatchModalJob } from "./modal-job";

const headers = { "Content-Type": "application/json" };

function run(fetchImpl: () => Promise<Response>) {
  const markFailed = mock(async (_msg: string) => {});
  const p = dispatchModalJob({
    endpoint: "https://modal.test/x",
    payload: { job_id: "j1" },
    headers,
    markFailed,
    fetchImpl,
  });
  return { markFailed, p };
}

describe("dispatchModalJob", () => {
  test("does nothing on a successful response", async () => {
    const { markFailed, p } = run(async () => Response.json({ status: "success" }));
    await p;
    expect(markFailed).not.toHaveBeenCalled();
  });

  test("marks failed on non-OK status without leaking the body", async () => {
    const { markFailed, p } = run(
      async () => new Response("secret internal trace", { status: 500 }),
    );
    await p;
    expect(markFailed).toHaveBeenCalledTimes(1);
    const msg = markFailed.mock.calls[0][0];
    expect(msg).toContain("500");
    expect(msg).not.toContain("secret");
  });

  test("marks failed when Modal reports status:error in a 200 body", async () => {
    const { markFailed, p } = run(async () => Response.json({ status: "error", message: "oom" }));
    await p;
    expect(markFailed).toHaveBeenCalledTimes(1);
  });

  test("marks failed when fetch throws", async () => {
    const { markFailed, p } = run(async () => {
      throw new Error("ECONNRESET");
    });
    await p;
    expect(markFailed).toHaveBeenCalledTimes(1);
  });

  test("tolerates a non-JSON 200 body", async () => {
    const { markFailed, p } = run(async () => new Response("ok"));
    await p;
    expect(markFailed).not.toHaveBeenCalled();
  });

  test("never rejects even if markFailed throws", async () => {
    const p = dispatchModalJob({
      endpoint: "https://modal.test/x",
      payload: {},
      headers,
      markFailed: async () => {
        throw new Error("db down");
      },
      fetchImpl: async () => new Response("x", { status: 502 }),
    });
    await expect(p).resolves.toBeUndefined();
  });
});
