"use client";

import { FileAudio, Languages, Loader2, Mic, Sparkles, Volume2, X } from "lucide-react";
import { useState } from "react";
import { AudioPreview } from "@/components/generation/AudioPreview";
import { GenerationCost } from "@/components/generation/GenerationCost";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { ParamControls } from "@/components/generation/ParamControls";
import { PromptInput } from "@/components/generation/PromptInput";
import { TranscriptPreview } from "@/components/generation/TranscriptPreview";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { postJob, useJobTracker } from "@/hooks/useJobTracker";
import { useUpload } from "@/hooks/useUpload";
import { INDIC_STT_LANGUAGES, INDIC_TTS_LANGUAGES, INDIC_VOICES } from "@/lib/indic";
import { defaultsFor, INDIC_STT_PARAMS, INDIC_TTS_PARAMS } from "@/lib/model-params";

type Mode = "tts" | "stt";

function LanguageSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Language</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function IndicSpeechPage() {
  const [mode, setMode] = useState<Mode>("tts");
  const [language, setLanguage] = useState("hi");
  const [voice, setVoice] = useState<string>("Ahana");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ttsValues, setTtsValues] = useState<Record<string, unknown>>(() =>
    defaultsFor(INDIC_TTS_PARAMS),
  );
  const [sttValues, setSttValues] = useState<Record<string, unknown>>(() =>
    defaultsFor(INDIC_STT_PARAMS),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tracker = useJobTracker();
  const { upload, uploading, error: uploadError, clearError } = useUpload("audio");
  const busy = submitting || uploading || tracker.isRunning;

  const switchMode = (next: Mode) => {
    setMode(next);
    setLanguage("hi");
    setSubmitError(null);
    tracker.setCompletedJobId(null);
    tracker.setFailure(null);
  };

  const run = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (mode === "tts") {
        tracker.start(
          await postJob("/api/generate/indic-speech", { ...ttsValues, text, language, voice }),
        );
      } else {
        if (!file) return;
        const audioUrl = await upload(file);
        if (!audioUrl) return;
        tracker.start(
          await postJob("/api/generate/transcribe", {
            ...sttValues,
            audioUrl,
            language,
            fileName: file.name,
          }),
        );
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setSubmitting(false);
    }
  };

  const ready = mode === "tts" ? text.trim().length > 0 : !!file;
  const error = submitError ?? uploadError ?? tracker.failure;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold sm:text-5xl">
          <span className="gradient-text">Indic Speech</span>
        </h1>
        <p className="text-lg text-foreground/60">
          Speak or transcribe Hindi, Tamil, Telugu and 20+ other Indian languages.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 lg:w-80">
          <div className="card-premium space-y-3 p-6">
            <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tts" disabled={busy} className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Text to speech
                </TabsTrigger>
                <TabsTrigger value="stt" disabled={busy} className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Speech to text
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-foreground/60">
              {mode === "tts"
                ? "Maya 2 Native · 12 languages · 24 kHz"
                : "IndicConformer 600M · 22 languages · up to 5 minutes of audio"}
            </p>
          </div>

          <div className="card-premium space-y-5 p-6">
            <LanguageSelect
              value={language}
              onChange={setLanguage}
              options={mode === "tts" ? INDIC_TTS_LANGUAGES : INDIC_STT_LANGUAGES}
              disabled={busy}
            />
            {mode === "tts" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Voice</Label>
                  <Select value={voice} onValueChange={setVoice} disabled={busy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIC_VOICES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ParamControls
                  defs={INDIC_TTS_PARAMS}
                  values={ttsValues}
                  onChange={(p) => setTtsValues((v) => ({ ...v, ...p }))}
                  disabled={busy}
                />
              </>
            ) : (
              <ParamControls
                defs={INDIC_STT_PARAMS}
                values={sttValues}
                onChange={(p) => setSttValues((v) => ({ ...v, ...p }))}
                disabled={busy}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="card-premium p-6">
            {mode === "tts" ? (
              <PromptInput
                value={text}
                onChange={setText}
                disabled={busy}
                maxLength={1000}
                placeholder="உங்கள் உரையை இங்கே எழுதுங்கள் · यहाँ अपना पाठ लिखें · Type text in any supported language..."
              />
            ) : file ? (
              <div className="flex items-center gap-3">
                <FileAudio className="h-8 w-8 text-cyan-400" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-semibold">{file.name}</p>
                  <p className="text-xs text-foreground/50">
                    {(file.size / 1048576).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove audio"
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    clearError();
                  }}
                  className="rounded-full p-1.5 hover:bg-foreground/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-foreground/20 p-10 text-center transition-colors hover:border-cyan-400/60 focus-within:border-cyan-400">
                <Languages className="h-10 w-10 text-cyan-400" />
                <span className="font-semibold">Choose an audio file</span>
                <span className="text-xs text-foreground/50">
                  WAV, MP3, OGG, FLAC, M4A or WebM, up to 25 MB / 5 minutes
                </span>
                <input
                  type="file"
                  accept="audio/*"
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
            onClick={run}
            disabled={!ready || busy}
            className="btn-premium w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {uploading
                ? "Uploading..."
                : busy
                  ? "Working..."
                  : mode === "tts"
                    ? "Speak"
                    : "Transcribe"}
            </span>
          </button>

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

          {mode === "tts" ? (
            <AudioPreview generationId={tracker.completedJobId} isLoading={tracker.isRunning} />
          ) : (
            <TranscriptPreview
              generationId={tracker.completedJobId}
              isLoading={tracker.isRunning}
            />
          )}
          <GenerationCost generationId={tracker.completedJobId} />
        </main>
      </div>
    </div>
  );
}
