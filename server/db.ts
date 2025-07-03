import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Simple pool configuration without aggressive limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduced connection limit
  idleTimeoutMillis: 60000 // Longer idle timeout
});

// Suppress pool errors to prevent crashes
pool.on('error', () => {
  // Silent error handling - continue operation
});

export const db = drizzle({ client: pool, schema });