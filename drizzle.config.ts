import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const normalizedDatabaseUrl = process.env.DATABASE_URL.includes("sslmode=")
  ? process.env.DATABASE_URL.replace(/sslmode=[^&]+/i, "sslmode=no-verify")
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}sslmode=no-verify`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizedDatabaseUrl,
  },
});
