import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

const result = await sql`
  SELECT id, status, output_url, error, created_at
  FROM generations
  ORDER BY created_at DESC
  LIMIT 5
`;

console.log('Recent generations:');
result.forEach(g => {
  console.log(`\nID: ${g.id}`);
  console.log(`Status: ${g.status}`);
  console.log(`Output URL: ${g.output_url}`);
  console.log(`Error: ${g.error || 'none'}`);
  console.log(`Created: ${g.created_at}`);
});
