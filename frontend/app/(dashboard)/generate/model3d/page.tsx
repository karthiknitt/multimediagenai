"use client";

import { Box, Clock, History, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GenerationCost } from "@/components/generation/GenerationCost";
import { GenerationLayout } from "@/components/generation/GenerationLayout";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { Model3DPreview } from "@/components/generation/ModelViewer";
import { ParamControls } from "@/components/generation/ParamControls";
import { useGenerations } from "@/hooks/useGeneration";
import { postJob, useJobTracker } from "@/hooks/useJobTracker";
import { useUpload } from "@/hooks/useUpload";
import { formatDistanceToNow } from "@/lib/date-utils";
import { defaultsFor, MODEL3D_PARAMS } from "@/lib/model-params";

const ACCEPT = "image/png,image/jpeg,image/webp";

export default function Model3DPage() {
  const [values, setValues] = useState<Record<string, unknown>>(() => defaultsFor(MODEL3D_PARAMS));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tracker = useJobTracker();
  const { upload, uploading, error: uploadError, clearError } = useUpload("image");
  const { data: history } = useGenerations(1, 8, "model3d");

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const busy = submitting || uploading || tracker.isRunning;

  const generate = async () => {
    if (!file) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const imageUrl = await upload(file);
      if (!imageUrl) return;
      const jobId = await postJob("/api/generate/image-to-3d", {
        ...values,
        imageUrl,
        name: file.name,
      });
      tracker.start(jobId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to start 3D generation");
    } finally {
      setSubmitting(false);
    }
  };

  const sidebar = (
    <div className="card-premium space-y-6 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
        Parameters
      </h3>
      <ParamControls
        defs={MODEL3D_PARAMS}
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        disabled={busy}
      />
    </div>
  );

  const historyPanel = (
    <div className="card-premium">
      <div className="border-b border-foreground/10 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-cyan-400" />
          Recent
        </h3>
      </div>
      <div className="space-y-2 p-4">
        {!history?.generations.length ? (
          <p className="py-8 text-center text-sm text-foreground/60">No 3D models yet</p>
        ) : (
          history.generations.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => tracker.setCompletedJobId(g.id)}
              className="glass hover-glow flex w-full items-start gap-3 rounded-lg border border-foreground/10 p-2 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-cyan-500/10">
                <Box className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="line-clamp-1 text-xs font-semibold">{g.prompt}</p>
                <p className="mono mt-1 flex items-center gap-1 text-xs text-foreground/50">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(g.createdAt)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const error = submitError ?? uploadError ?? tracker.failure;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold sm:text-5xl">
          <span className="gradient-text">Image to 3D</span>
        </h1>
        <p className="text-lg text-foreground/60">
          Turn a photo into a 3D model: Hunyuan3D builds the shape, Hi3D sharpens it.
        </p>
      </header>

      <GenerationLayout sidebar={sidebar} history={historyPanel}>
        <div className="space-y-6">
          <div className="card-premium p-6">
            {preview ? (
              <div className="relative mx-auto w-fit">
                {/* biome-ignore lint/performance/noImgElement: local blob preview */}
                <img src={preview} alt="Selected" className="max-h-72 rounded-lg" />
                <button
                  type="button"
                  aria-label="Remove image"
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    clearError();
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-black/70 p-1.5 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-foreground/20 p-10 text-center transition-colors hover:border-cyan-400/60 focus-within:border-cyan-400">
                <ImagePlus className="h-10 w-10 text-cyan-400" />
                <span className="font-semibold">Choose a photo</span>
                <span className="text-xs text-foreground/50">
                  PNG, JPEG or WebP, up to 10 MB. One object, clearly visible, works best.
                </span>
                <input
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    clearError();
                  }}
                />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!file || busy}
            className="btn-premium w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {uploading ? "Uploading..." : busy ? "Generating..." : "Generate 3D model"}
            </span>
          </button>
          <p className="mono text-center text-xs text-foreground/50">
            ~1-3 minutes, plus a longer first run while the GPU warms up
          </p>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          {tracker.isRunning && (
            <GenerationProgress
              status={tracker.status}
              progress={tracker.progress}
              message={tracker.message}
              onCancel={tracker.cancel}
            />
          )}

          <Model3DPreview
            generationId={tracker.completedJobId}
            isLoading={tracker.isRunning}
            onRegenerate={file ? generate : undefined}
          />
          <GenerationCost generationId={tracker.completedJobId} />
        </div>
      </GenerationLayout>
    </div>
  );
}
