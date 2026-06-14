// backend/src/db.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client/client';

// 1. Create a native PostgreSQL connection pool using our environment variable
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Wrap it in the Prisma 7 driver adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the constructor
export const prisma = new PrismaClient({ adapter });