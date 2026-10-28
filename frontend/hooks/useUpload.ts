"use client";

import { useCallback, useState } from "react";
import type { UploadKind } from "@/lib/upload-validation";

/** Upload a file to R2 via /api/upload and return its public URL. */
export function useUpload(kind: UploadKind) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.set("kind", kind);
        form.set("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Upload failed");
        return data.url as string;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [kind],
  );

  return { upload, uploading, error, clearError: () => setError(null) };
}
