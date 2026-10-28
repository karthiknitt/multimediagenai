"use client";

import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { INDIC_STT_LANGUAGES } from "@/lib/indic";

interface Transcript {
  text: string;
  language: string;
  duration_s: number;
}

export function TranscriptPreview({
  generationId,
  isLoading,
}: {
  generationId?: string | null;
  isLoading?: boolean;
}) {
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!generationId) return;
    let cancelled = false;
    fetch(`/api/media/${generationId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Transcript not found"))))
      .then((d: Transcript) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [generationId]);

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data.text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${generationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-premium">
      <CardContent className="space-y-4 p-6">
        {!generationId || (!data && !error) ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-foreground/50">
            {isLoading || generationId ? (
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            ) : (
              <FileText className="h-10 w-10" />
            )}
            <p className="text-sm">
              {isLoading || generationId ? "Transcribing..." : "Your transcript will appear here"}
            </p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : (
          data && (
            <>
              <div className="flex items-center justify-between text-xs text-foreground/60 mono">
                <span>
                  {INDIC_STT_LANGUAGES[data.language as keyof typeof INDIC_STT_LANGUAGES] ??
                    data.language}
                </span>
                <span>{data.duration_s}s of audio</span>
              </div>
              {/* Indic scripts need a roomy line height; lang helps screen readers/fonts */}
              <p lang={data.language} className="whitespace-pre-wrap text-lg leading-relaxed">
                {data.text || "(No speech detected)"}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={copy} className="flex-1">
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" variant="outline" onClick={download} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Save .txt
                </Button>
              </div>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
