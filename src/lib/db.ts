// src/lib/db.ts
import { Client } from 'pg';

export function getDbClient() {
  const connectionString = import.meta.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }
  return new Client({ connectionString });
}