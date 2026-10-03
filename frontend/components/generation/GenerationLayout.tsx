"use client";

import { cn } from "@/lib/utils";

interface GenerationLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  history?: React.ReactNode;
  className?: string;
}

export function GenerationLayout({ children, sidebar, history, className }: GenerationLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row", className)}>
      {/* Left sidebar - Parameters */}
      {sidebar && (
        <aside className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 space-y-6">{sidebar}</div>
        </aside>
      )}

      {/* Main content - Preview */}
      <main className="flex-1">{children}</main>

      {/* Right sidebar - History */}
      {history && (
        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-24">{history}</div>
        </aside>
      )}
    </div>
  );
}
