"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface MediaModalProps {
  type: "image" | "video";
  src: string;
  title: string;
  downloadHref?: string;
  onClose: () => void;
}

/** Full-size viewer: the image at full resolution, or the video with controls. */
export function MediaModal({ type, src, title, downloadHref, onClose }: MediaModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      {/* Backdrop: clicking outside the media closes the modal */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close viewer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex max-h-full max-w-full flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-4 text-white">
          <p className="line-clamp-1 text-sm text-white/80">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            {downloadHref && (
              <a
                href={downloadHref}
                download
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {type === "image" ? (
          <img
            src={src}
            alt={title}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            loop
            playsInline
            className="max-h-[85vh] max-w-full rounded-lg"
          >
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  );
}
