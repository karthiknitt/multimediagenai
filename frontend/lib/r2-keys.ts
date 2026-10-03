/** Object key (e.g. `videos/20251227/abc.mp4`) from a stored R2 public URL. */
export function objectKeyFromUrl(url: string): string {
  return url.split("/").slice(-3).join("/");
}

const EXTENSIONS: Record<string, string> = {
  image: "png",
  video: "mp4",
  audio: "wav",
  speech: "wav",
};

/** Download filename for a generation, preferring the real extension of the stored file. */
export function downloadFilename(type: string, id: string, outputUrl: string): string {
  const ext = outputUrl.split("?")[0].split(".").pop()?.toLowerCase();
  const safe = ext && /^[a-z0-9]{2,4}$/.test(ext) ? ext : (EXTENSIONS[type] ?? "bin");
  return `${type}-${id}.${safe}`;
}
