/**
 * Only allow https URLs whose origin exactly matches the configured R2 public base.
 * Parsing (rather than substring matching) blocks `evil.com/?.r2.dev`,
 * `pub-x.r2.dev.evil.com` and `pub-x.r2.dev@evil.com` style bypasses.
 */
export function isAllowedMediaUrl(rawUrl: string, publicBase: string | undefined): boolean {
  if (!publicBase) return false;
  try {
    const url = new URL(rawUrl);
    const base = new URL(publicBase);
    return (
      url.protocol === "https:" && url.origin === base.origin && !url.username && !url.password
    );
  } catch {
    return false;
  }
}
