/**
 * Background task to poll Modal API call status and update database
 * This runs after the Modal API spawns an async generation task
 */

import { db } from "./db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ModalCallResult {
  job_id: string;
  output_url?: string;
  processing_time_ms?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Poll a Modal function call until it completes
 * This should be called as a background task after spawning the Modal call
 */
export async function pollModalCall(
  callId: string,
  jobId: string,
  maxAttempts: number = 180, // 15 minutes at 5-second intervals
  intervalMs: number = 5000
): Promise<void> {
  let attempts = 0;

  const poll = async (): Promise<boolean> => {
    attempts++;

    try {
      // In production, you would poll Modal's API to check call status
      // For now, we'll just poll the database which will be updated by Modal
      const [generation] = await db
        .select()
        .from(generations)
        .where(eq(generations.id, jobId))
        .limit(1);

      if (!generation) {
        console.error(`Generation ${jobId} not found`);
        return true; // Stop polling
      }

      // Check if generation is complete
      if (generation.status === "completed" || generation.status === "failed") {
        console.log(`Generation ${jobId} finished with status: ${generation.status}`);
        return true; // Stop polling
      }

      // Check max attempts
      if (attempts >= maxAttempts) {
        // Timeout - mark as failed
        await db
          .update(generations)
          .set({
            status: "failed",
            error: "Generation timed out after 15 minutes",
          })
          .where(eq(generations.id, jobId));

        console.error(`Generation ${jobId} timed out after ${maxAttempts} attempts`);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (error) {
      console.error(`Error polling generation ${jobId}:`, error);

      if (attempts >= 3) {
        // After 3 failed attempts, mark as failed
        try {
          await db
            .update(generations)
            .set({
              status: "failed",
              error: "Failed to check generation status",
            })
            .where(eq(generations.id, jobId));
        } catch (dbError) {
          console.error("Failed to update database:", dbError);
        }
        return true; // Stop polling
      }

      return false; // Continue polling
    }
  };

  // Start polling loop
  while (true) {
    const shouldStop = await poll();
    if (shouldStop) break;

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Simpler version: Just start polling in the background
 * This is called from the API route and doesn't block the response
 */
export function startBackgroundPolling(callId: string, jobId: string): void {
  // Run in background without awaiting
  pollModalCall(callId, jobId).catch((error) => {
    console.error(`Background polling failed for ${jobId}:`, error);
  });
}
