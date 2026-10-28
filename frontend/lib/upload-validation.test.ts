import { describe, expect, test } from "bun:test";
import { sniffUpload } from "./upload-validation";

const bytes = (...v: number[]) => Uint8Array.from([...v, ...new Array(16).fill(0)]);
const text = (s: string, at = 0) => {
  const b = new Uint8Array(32);
  for (let i = 0; i < s.length; i++) b[at + i] = s.charCodeAt(i);
  return b;
};

describe("sniffUpload images", () => {
  test("accepts png/jpeg/webp", () => {
    expect(sniffUpload("image", bytes(0x89, 0x50, 0x4e, 0x47))?.ext).toBe("png");
    expect(sniffUpload("image", bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    const webp = text("RIFF");
    webp.set(text("WEBP").subarray(0, 4), 8);
    expect(sniffUpload("image", webp)?.ext).toBe("webp");
  });
  test("rejects svg/html/gif and audio", () => {
    expect(sniffUpload("image", text("<svg xmlns"))).toBeNull();
    expect(sniffUpload("image", text("<html>"))).toBeNull();
    expect(sniffUpload("image", text("GIF89a"))).toBeNull();
    expect(sniffUpload("image", text("OggS"))).toBeNull();
  });
});

describe("sniffUpload audio", () => {
  test("accepts common audio containers", () => {
    const wav = text("RIFF");
    wav.set(text("WAVE").subarray(0, 4), 8);
    expect(sniffUpload("audio", wav)?.ext).toBe("wav");
    expect(sniffUpload("audio", text("ID3"))?.ext).toBe("mp3");
    expect(sniffUpload("audio", bytes(0xff, 0xfb))?.ext).toBe("mp3");
    expect(sniffUpload("audio", text("OggS"))?.ext).toBe("ogg");
    expect(sniffUpload("audio", text("fLaC"))?.ext).toBe("flac");
    expect(sniffUpload("audio", text("ftypM4A ", 4))?.ext).toBe("m4a");
    expect(sniffUpload("audio", bytes(0x1a, 0x45, 0xdf, 0xa3))?.ext).toBe("webm");
  });
  test("rejects executables, images and empty input", () => {
    expect(sniffUpload("audio", text("MZ"))).toBeNull();
    expect(sniffUpload("audio", bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(sniffUpload("audio", new Uint8Array(0))).toBeNull();
  });
});
