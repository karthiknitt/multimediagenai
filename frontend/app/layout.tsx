import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Video Generation Platform",
  description:
    "Generate high-quality images, videos, and audio from text prompts using state-of-the-art AI models",
  keywords: [
    "AI",
    "image generation",
    "video generation",
    "audio generation",
    "FLUX",
    "Mochi",
    "CogVideoX",
    "MusicGen",
  ],
  authors: [{ name: "AI Video Gen" }],
  openGraph: {
    title: "AI Video Generation Platform",
    description:
      "Generate high-quality images, videos, and audio from text prompts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
