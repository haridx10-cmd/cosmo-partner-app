import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const normalizedDatabaseUrl = process.env.DATABASE_URL.includes("sslmode=")
  ? process.env.DATABASE_URL.replace(/sslmode=[^&]+/i, "sslmode=no-verify")
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}sslmode=no-verify`;

export const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
