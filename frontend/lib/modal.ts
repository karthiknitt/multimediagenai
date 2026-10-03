/**
 * Headers for calling our Modal web endpoints. The endpoints are deployed with
 * `requires_proxy_auth=True`, so every call needs a Modal proxy-auth token pair.
 * Create one in the Modal dashboard (Settings > Proxy Auth Tokens).
 */
export function modalHeaders(): Record<string, string> {
  const id = process.env.MODAL_PROXY_TOKEN_ID;
  const secret = process.env.MODAL_PROXY_TOKEN_SECRET;
  if (!id) throw new Error("MODAL_PROXY_TOKEN_ID is not configured");
  if (!secret) throw new Error("MODAL_PROXY_TOKEN_SECRET is not configured");
  return {
    "Content-Type": "application/json",
    "Modal-Key": id,
    "Modal-Secret": secret,
  };
}
