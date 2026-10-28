"use client";

import { FileAudio, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { useUpload } from "@/hooks/useUpload";
import type { UploadKind } from "@/lib/upload-validation";

interface UploadFieldProps {
  kind: UploadKind;
  /** URL of the uploaded file (set after a successful upload) */
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  hint?: string;
}

const ACCEPT: Record<UploadKind, string> = {
  image: "image/png,image/jpeg,image/webp",
  audio: "audio/*",
};

/** File picker that uploads to R2 straight away and reports the resulting URL. */
export function UploadField({ kind, value, onChange, disabled, hint }: UploadFieldProps) {
  const { upload, uploading, error, clearError } = useUpload(kind);
  const [name, setName] = useState<string | null>(null);
  const Icon = kind === "image" ? ImagePlus : FileAudio;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const url = await upload(file);
    if (url) {
      setName(file.name);
      onChange(url);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-foreground/15 p-3">
          <Icon className="h-6 w-6 shrink-0 text-cyan-400" />
          <span className="flex-1 truncate text-sm">{name ?? "Uploaded file"}</span>
          <button
            type="button"
            aria-label="Remove file"
            disabled={disabled}
            onClick={() => {
              setName(null);
              clearError();
              onChange(undefined);
            }}
            className="rounded-full p-1.5 hover:bg-foreground/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-foreground/20 p-5 text-sm transition-colors focus-within:border-cyan-400 hover:border-cyan-400/60">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? "Uploading..."
            : kind === "image"
              ? "Choose an image"
              : "Choose an audio clip"}
          <input
            type="file"
            accept={ACCEPT[kind]}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
      )}
      {hint && <p className="text-xs text-foreground/50">{hint}</p>}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
