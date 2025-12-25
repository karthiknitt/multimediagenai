import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";

// SSE timeout: 15 minutes
const SSE_TIMEOUT = 15 * 60 * 1000;

// Poll interval for checking job status
const POLL_INTERVAL = 2000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Authenticate user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify job exists and belongs to user
  const [job] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, jobId))
    .limit(1);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  if (job.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let lastProgress = 0;

      const sendEvent = (data: Record<string, unknown>) => {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      };

      // Send initial heartbeat
      sendEvent({
        type: "heartbeat",
        jobId,
        timestamp: new Date().toISOString(),
      });

      // Poll for updates
      const pollForUpdates = async () => {
        try {
          const [currentJob] = await db
            .select()
            .from(generations)
            .where(eq(generations.id, jobId))
            .limit(1);

          if (!currentJob) {
            sendEvent({
              type: "failed",
              jobId,
              error: "Job not found",
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Check timeout
          if (Date.now() - startTime > SSE_TIMEOUT) {
            sendEvent({
              type: "failed",
              jobId,
              error: "Generation timed out",
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Handle completed status
          if (currentJob.status === "completed") {
            sendEvent({
              type: "completed",
              jobId,
              progress: 100,
              outputUrl: currentJob.outputUrl,
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Handle failed status
          if (currentJob.status === "failed") {
            sendEvent({
              type: "failed",
              jobId,
              error: currentJob.error || "Generation failed",
              timestamp: new Date().toISOString(),
            });
            controller.close();
            return;
          }

          // Simulate progress for processing jobs
          // In production, this would come from the actual generation process
          if (currentJob.status === "processing") {
            // Simulate progress increase
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const estimatedDuration = 30; // Assume 30 seconds for image generation
            const simulatedProgress = Math.min(
              95,
              Math.floor((elapsedSeconds / estimatedDuration) * 100)
            );

            if (simulatedProgress > lastProgress) {
              lastProgress = simulatedProgress;
              sendEvent({
                type: "progress",
                jobId,
                progress: simulatedProgress,
                status: "processing",
                message: `Generating... ${simulatedProgress}%`,
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Continue polling
          setTimeout(pollForUpdates, POLL_INTERVAL);
        } catch (error) {
          console.error("SSE poll error:", error);
          sendEvent({
            type: "failed",
            jobId,
            error: "Failed to check generation status",
            timestamp: new Date().toISOString(),
          });
          controller.close();
        }
      };

      // Start polling
      pollForUpdates();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
