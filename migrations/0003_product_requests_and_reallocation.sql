CREATE TABLE IF NOT EXISTS "product_requests" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id"),
  "beautician_id" integer NOT NULL REFERENCES "employees"("id"),
  "quantity_requested" numeric NOT NULL,
  "quantity_approved" numeric,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_at" timestamp DEFAULT now(),
  "approved_at" timestamp,
  "approved_by" integer REFERENCES "employees"("id"),
  "remarks" text
);

ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "quantity_approved" numeric;
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "requested_at" timestamp DEFAULT now();
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "approved_by" integer REFERENCES "employees"("id");
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "remarks" text;

CREATE INDEX IF NOT EXISTS "idx_product_requests_status" ON "product_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_product_requests_beautician" ON "product_requests" ("beautician_id");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reference_order_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
