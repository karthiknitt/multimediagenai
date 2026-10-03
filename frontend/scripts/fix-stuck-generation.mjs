import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Fixing stuck generation...\n");

const result = await sql`
  UPDATE generations
  SET
    status = 'failed',
    error = 'Generation timed out - stopped manually'
  WHERE id = '2ef8210c-b1c7-433c-b3b8-bc382531202a'
  RETURNING id, status, error
`;

if (result.length > 0) {
  console.log("✓ Updated generation:");
  console.log(`  ID: ${result[0].id}`);
  console.log(`  Status: ${result[0].status}`);
  console.log(`  Error: ${result[0].error}`);
} else {
  console.log("No generation found with that ID");
}
