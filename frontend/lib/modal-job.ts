interface DispatchOptions {
  endpoint: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  /** Called with a user-safe message when the job can't be started or Modal reports an error. */
  markFailed: (message: string) => Promise<void>;
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
}

/**
 * Fire-and-forget call to a Modal endpoint. Modal writes progress and the final
 * result to the generations row itself; this only makes sure a failed or
 * unreachable call can never leave the job hanging. Never rejects.
 * Details are logged server-side; the stored message stays generic.
 */
export async function dispatchModalJob({
  endpoint,
  payload,
  headers,
  markFailed,
  fetchImpl = fetch,
}: DispatchOptions): Promise<void> {
  const fail = async (message: string) => {
    try {
      await markFailed(message);
    } catch (error) {
      console.error("Failed to record job failure:", error);
    }
  };

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Modal returned ${response.status}:`, await response.text().catch(() => ""));
      await fail(`Generation service error (HTTP ${response.status})`);
      return;
    }

    const result = await response.json().catch(() => null);
    if (result?.status === "error") {
      console.error("Modal reported error:", result.message);
      await fail("Generation failed. Please try again.");
    }
  } catch (error) {
    console.error("Modal call failed:", error);
    await fail("Could not reach the generation service. Please try again.");
  }
}
