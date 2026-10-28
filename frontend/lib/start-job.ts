import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";
import { dispatchModalJob } from "@/lib/modal-job";

type GenerationInsert = typeof generations.$inferInsert;

interface StartJobOptions {
  jobId: string;
  userId: string;
  type: GenerationInsert["type"];
  model: string;
  prompt: string;
  parameters: Record<string, unknown>;
  endpoint: string;
  /** Modal payload without `job_id` */
  payload: Record<string, unknown>;
  message: string;
}

/**
 * Shared tail of the job-starting routes: insert the row, then fire the Modal call
 * without awaiting it (Modal updates the row itself; failures are recorded on it).
 */
export async function startModalJob(o: StartJobOptions) {
  const headers = modalHeaders();
  await db.insert(generations).values({
    id: o.jobId,
    userId: o.userId,
    type: o.type,
    model: o.model,
    prompt: o.prompt,
    parameters: o.parameters,
    status: "processing",
    progress: 0,
  });

  void dispatchModalJob({
    endpoint: o.endpoint,
    headers,
    payload: { job_id: o.jobId, ...o.payload },
    markFailed: async (message) => {
      await db
        .update(generations)
        .set({ status: "failed", error: message })
        .where(eq(generations.id, o.jobId));
    },
  });

  return NextResponse.json({ jobId: o.jobId, status: "pending", message: o.message });
}
