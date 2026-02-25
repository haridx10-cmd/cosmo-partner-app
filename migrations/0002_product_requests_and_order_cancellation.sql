ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "quantity_approved" numeric;
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "product_requests" ADD COLUMN IF NOT EXISTS "approved_by" integer REFERENCES "employees"("id");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;

CREATE INDEX IF NOT EXISTS "idx_product_requests_status" ON "product_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_product_requests_beautician" ON "product_requests" ("beautician_id");
