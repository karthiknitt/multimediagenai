import { describe, expect, test } from "bun:test";
import { downloadFilename, objectKeyFromUrl } from "./r2-keys";

describe("objectKeyFromUrl", () => {
  test("keeps the last three path segments", () => {
    expect(objectKeyFromUrl("https://pub-x.r2.dev/videos/20251227/a.mp4")).toBe(
      "videos/20251227/a.mp4",
    );
  });
});

describe("downloadFilename", () => {
  test("uses the stored file's extension", () => {
    expect(downloadFilename("audio", "1", "https://x/audio/d/a.mp3")).toBe("audio-1.mp3");
  });
  test("falls back to the type's default extension", () => {
    expect(downloadFilename("video", "2", "https://x/videos/d/noext")).toBe("video-2.mp4");
    expect(downloadFilename("weird", "3", "https://x/a/b/noext")).toBe("weird-3.bin");
  });
});
