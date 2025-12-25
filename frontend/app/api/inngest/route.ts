import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateImage, generateVideo, generateAudio } from "@/inngest/functions";

// Configure runtime for Inngest
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateImage, generateVideo, generateAudio],
});
