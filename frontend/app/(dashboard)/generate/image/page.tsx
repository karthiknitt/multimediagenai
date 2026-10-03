"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, History, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import type { z } from "zod";
import { GenerationCost } from "@/components/generation/GenerationCost";
import { GenerationLayout } from "@/components/generation/GenerationLayout";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { ImagePreview } from "@/components/generation/ImagePreview";
import { imageModels, ModelSelector } from "@/components/generation/ModelSelector";
import { ParamControls } from "@/components/generation/ParamControls";
import { PromptInput } from "@/components/generation/PromptInput";
import { SecureThumbnail } from "@/components/generation/SecureThumbnail";
import { useCancelGeneration, useGenerateImage } from "@/hooks/useGeneration";
import { useGenerationStream } from "@/hooks/useGenerationStream";
import { formatDistanceToNow } from "@/lib/date-utils";
import { IMAGE_PARAMS } from "@/lib/model-params";
import { imageGenerationSchema } from "@/lib/validation";
import { type ImageParams, useGenerationStore } from "@/store/generation-store";

// Define form data type that uses the schema with required fields
type FormData = z.input<typeof imageGenerationSchema>;

export default function ImageGenerationPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);

  const { imageParams, setImageParams, history, addJob, updateJob } = useGenerationStore();

  const generateMutation = useGenerateImage();
  const cancelMutation = useCancelGeneration();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(imageGenerationSchema),
    defaultValues: imageParams,
  });

  const prompt = watch("prompt") ?? "";
  const model = watch("model") ?? "z-image-turbo";
  const values = watch();

  // SSE stream for progress updates
  const { lastEvent, isConnected } = useGenerationStream(activeJobId, {
    onProgress: (event) => {
      console.log("Progress event:", event);
    },
    onComplete: (event) => {
      console.log("Complete event:", event);
      setCompletedJobId(activeJobId);
      setActiveJobId(null);
    },
    onError: (event) => {
      console.error("Error event:", event);
      setActiveJobId(null);
    },
  });

  const currentProgress = lastEvent?.progress ?? 0;
  const currentStatus =
    lastEvent?.type === "failed"
      ? "failed"
      : lastEvent?.type === "completed"
        ? "completed"
        : lastEvent?.type === "progress" && lastEvent.progress && lastEvent.progress > 0
          ? "processing"
          : activeJobId
            ? "pending"
            : "pending";

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      // Save params to store, then start generation
      setImageParams({ ...data, model: data.model ?? "z-image-turbo" });
      const result = await generateMutation.mutateAsync(data);

      // Track the job
      const jobId = result.jobId;
      setActiveJobId(jobId);
      setCompletedJobId(null);

      addJob({
        id: jobId,
        type: "image",
        status: "pending",
        progress: 0,
        prompt: data.prompt,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Generation failed:", error);
    }
  };

  const handleCancel = useCallback(() => {
    if (activeJobId) {
      cancelMutation.mutate(activeJobId);
      updateJob(activeJobId, { status: "failed", error: "Cancelled by user" });
      setActiveJobId(null);
    }
  }, [activeJobId, cancelMutation, updateJob]);

  const handleRegenerate = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const handleHistoryItemClick = (item: (typeof history)[0]) => {
    setValue("prompt", item.prompt);
    // Set the completed job ID to display the historical image
    if (item.id) {
      setCompletedJobId(item.id);
    }
  };

  const isGenerating = generateMutation.isPending || !!activeJobId;

  // Keyboard shortcuts for form submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit form
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isGenerating && prompt.trim()) {
          handleSubmit(onSubmit)();
        }
      }
      // Escape to cancel generation
      if (e.key === "Escape" && isGenerating) {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGenerating, prompt, handleSubmit, onSubmit, handleCancel]);

  // Sidebar with parameters
  const sidebar = (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
          Model
        </h3>
        <ModelSelector
          value={model}
          onChange={(value) => setValue("model", value as "z-image-turbo")}
          models={imageModels}
          disabled={isGenerating}
        />
      </div>

      <div className="card-premium p-6">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
          Parameters
        </h3>
        <ParamControls
          defs={IMAGE_PARAMS}
          values={values}
          onChange={(patch) => {
            for (const [key, value] of Object.entries(patch)) {
              setValue(key as keyof FormData, value as never, { shouldDirty: true });
            }
          }}
          disabled={isGenerating}
        />
      </div>
    </div>
  );

  // History sidebar
  const historyPanel = (
    <div className="card-premium">
      <div className="p-6 border-b border-foreground/10">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-cyan-400" />
          Recent
        </h3>
      </div>
      <div className="p-4">
        {history.filter((h) => h.type === "image").length === 0 ? (
          <p className="text-center text-sm text-foreground/60 py-8">No recent generations</p>
        ) : (
          <div className="space-y-2">
            {history
              .filter((h) => h.type === "image")
              .slice(0, 10)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleHistoryItemClick(item)}
                  className="flex w-full items-start gap-3 rounded-lg glass hover-glow border border-foreground/10 p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Load prompt: ${item.prompt.slice(0, 50)}${item.prompt.length > 50 ? "..." : ""}`}
                >
                  {item.id ? (
                    <SecureThumbnail
                      generationId={item.id}
                      alt={item.prompt.slice(0, 20)}
                      className="h-12 w-12 shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-cyan-500/10">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="line-clamp-2 text-xs font-semibold">{item.prompt}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50 mono">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(item.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          <span className="gradient-text">Image Generation</span>
        </h1>
        <p className="text-foreground/60 text-lg">
          Create stunning images from text descriptions using Z-Image-Turbo
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} aria-label="Image generation form">
        <GenerationLayout sidebar={sidebar} history={historyPanel}>
          <div className="space-y-6" role="main">
            {/* Prompt input */}
            <div className="card-premium p-6">
              <PromptInput
                showTemplates
                value={prompt}
                onChange={(value) => setValue("prompt", value)}
                disabled={isGenerating}
                maxLength={2000}
                autoFocus={true}
              />
              {errors.prompt && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {errors.prompt.message}
                </p>
              )}
            </div>

            {/* Generate button */}
            <div className="space-y-2">
              <button
                type="submit"
                className="btn-premium w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                disabled={isGenerating || !prompt.trim()}
                aria-label={
                  isGenerating ? "Generating image, please wait" : "Generate image from prompt"
                }
                aria-live="polite"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {isGenerating ? "Generating..." : "Generate Image"}
                </span>
              </button>
              {!isGenerating && (
                <p className="text-center text-xs text-foreground/50 mono">
                  Tip: Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 border border-foreground/20">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 border border-foreground/20">
                    Enter
                  </kbd>{" "}
                  to generate
                </p>
              )}
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <GenerationProgress
                  status={currentStatus as "pending" | "processing" | "completed" | "failed"}
                  progress={currentProgress}
                  message={lastEvent?.message}
                  onCancel={handleCancel}
                  error={lastEvent?.error}
                />
                {activeJobId && (
                  <div className="flex items-center justify-center gap-2 text-xs text-foreground/50 mono">
                    <div
                      className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                    />
                    <span>{isConnected ? "Connected to server" : "Connecting..."}</span>
                    {lastEvent && <span>• Last update: {lastEvent.type}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <ImagePreview
              generationId={completedJobId}
              isLoading={isGenerating}
              onRegenerate={completedJobId ? handleRegenerate : undefined}
            />
            <GenerationCost generationId={completedJobId} />
          </div>
        </GenerationLayout>
      </form>
    </div>
  );
}
