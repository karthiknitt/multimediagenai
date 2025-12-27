import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { desc } from 'drizzle-orm';

const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  parameters: jsonb("parameters"),
  outputUrl: text("output_url"),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  progressMessage: text("progress_message"),
  error: text("error"),
  processingTimeMs: integer("processing_time_ms"),
  sourceImageUrl: text("source_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const jobs = await db.select().from(generations).orderBy(desc(generations.createdAt)).limit(5);
console.log('Latest 5 generations:');
jobs.forEach((job, i) => {
  console.log(`\n${i + 1}. Job ID: ${job.id}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Progress: ${job.progress}%`);
  console.log(`   Model: ${job.model}`);
  console.log(`   Output URL: ${job.outputUrl || 'None'}`);
  console.log(`   Error: ${job.error || 'None'}`);
});

await pool.end();
