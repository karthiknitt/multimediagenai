/** Validation for user uploads sent to R2 (the Modal apps later fetch them by URL). */
export type UploadKind = "image" | "audio";

export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
};

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (b: Uint8Array, at: number, text: string) =>
  [...text].every((c, i) => b[at + i] === c.charCodeAt(0));

/** Sniff the real format from the file header; never trust the client's content type. */
export function sniffUpload(
  kind: UploadKind,
  bytes: Uint8Array,
): { ext: string; contentType: string } | null {
  if (kind === "image") {
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]))
      return { ext: "png", contentType: "image/png" };
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
    if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP"))
      return { ext: "webp", contentType: "image/webp" };
    return null;
  }
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE"))
    return { ext: "wav", contentType: "audio/wav" };
  if (ascii(bytes, 0, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))
    return { ext: "mp3", contentType: "audio/mpeg" };
  if (ascii(bytes, 0, "OggS")) return { ext: "ogg", contentType: "audio/ogg" };
  if (ascii(bytes, 0, "fLaC")) return { ext: "flac", contentType: "audio/flac" };
  if (ascii(bytes, 4, "ftyp")) return { ext: "m4a", contentType: "audio/mp4" };
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]))
    return { ext: "webm", contentType: "audio/webm" };
  return null;
}
