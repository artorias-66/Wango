import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log("Connected to DB.");
  
  await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
  console.log("PostGIS extension created successfully.");
  
  await client.end();
}

main().catch(e => console.error(e));
