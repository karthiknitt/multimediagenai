import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { MAX_UPLOAD_BYTES, sniffUpload, type UploadKind } from "@/lib/upload-validation";

/**
 * Upload a source image (image-to-3D) or audio clip (transcription) to R2 and return
 * its public URL, which the Modal apps then fetch (R2 origin only). The format is sniffed
 * from the file header; the client's content type and filename are ignored.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if ((kind !== "image" && kind !== "audio") || !(file instanceof File)) {
      return NextResponse.json({ error: "kind and file are required" }, { status: 400 });
    }
    const uploadKind: UploadKind = kind;

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES[uploadKind]) {
      return NextResponse.json(
        { error: `File must be between 1 byte and ${MAX_UPLOAD_BYTES[uploadKind] / 1048576} MB` },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = sniffUpload(uploadKind, bytes);
    if (!detected) {
      return NextResponse.json(
        {
          error:
            uploadKind === "image"
              ? "Unsupported image. Use PNG, JPEG or WebP."
              : "Unsupported audio. Use WAV, MP3, OGG, FLAC, M4A or WebM.",
        },
        { status: 415 },
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const key = `uploads/${session.user.id}/${date}/${randomUUID()}.${detected.ext}`;
    const url = await uploadToR2(key, bytes, detected.contentType);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
