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
  // Only manage tables that belong to this app — ignore any tables from other projects
  // sharing the same Supabase database.
  tablesFilter: [
    "sessions",
    "employees",
    "orders",
    "issues",
    "attendance",
    "location_history",
    "beautician_live_tracking",
    "order_service_sessions",
    "products",
    "product_purchases",
    "product_consumptions",
    "product_requests",
    "service_product_mapping",
    "products_not_found",
    "order_default_products",
    "messages",
  ],
});
