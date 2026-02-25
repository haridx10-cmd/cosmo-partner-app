-- Inventory tracking hardening and defaults sync support

CREATE TABLE IF NOT EXISTS "order_default_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL REFERENCES "products"("id"),
  "quantity" numeric NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_default_products_product_unique"
  ON "order_default_products" ("product_id");

ALTER TABLE "product_consumptions"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

UPDATE "product_consumptions"
SET "created_at" = now()
WHERE "created_at" IS NULL;

-- Collapse duplicate rows so unique(order_id, product_id) can be applied safely.
WITH grouped AS (
  SELECT
    MIN(id) AS keep_id,
    order_id,
    product_id,
    SUM(quantity_used::numeric) AS total_qty
  FROM product_consumptions
  GROUP BY order_id, product_id
)
UPDATE product_consumptions pc
SET quantity_used = grouped.total_qty
FROM grouped
WHERE pc.id = grouped.keep_id;

WITH grouped AS (
  SELECT
    MIN(id) AS keep_id,
    order_id,
    product_id
  FROM product_consumptions
  GROUP BY order_id, product_id
)
DELETE FROM product_consumptions pc
USING grouped
WHERE pc.order_id = grouped.order_id
  AND pc.product_id = grouped.product_id
  AND pc.id <> grouped.keep_id;

ALTER TABLE "product_consumptions"
  DROP COLUMN IF EXISTS "external_order_id";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_consumptions_order_product_unique"
  ON "product_consumptions" ("order_id", "product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_product_mapping_service_product_unique"
  ON "service_product_mapping" ("service_name", "product_id");

CREATE TABLE IF NOT EXISTS "products_not_found" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer,
  "external_order_id" text,
  "service_name" text NOT NULL,
  "product_name" text,
  "created_at" timestamp DEFAULT now()
);
