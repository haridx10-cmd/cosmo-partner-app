import dotenv from "dotenv";
dotenv.config();

import { storage } from "../server/storage";
import { db } from "../server/db";
import { employees, orders, products, productConsumptions, productsNotFound } from "../shared/schema";
import { and, eq, inArray, ne } from "drizzle-orm";

async function ensureSeedProducts() {
  const existing = await storage.getActiveProducts();
  if (existing.length >= 2) return existing;

  await storage.upsertProductByName({ name: "Bedsheet", unit: "pcs", costPerUnit: "45", lowStockThreshold: "10" });
  await storage.upsertProductByName({ name: "Gown", unit: "pcs", costPerUnit: "30", lowStockThreshold: "10" });
  await storage.upsertProductByName({ name: "Wax Strip", unit: "pcs", costPerUnit: "5", lowStockThreshold: "50" });
  return storage.getActiveProducts();
}

async function ensureServiceMappings(productIds: number[]) {
  await storage.upsertServiceProductMapping({ serviceName: "manicure", productId: productIds[0], quantityRequired: "1" });
  await storage.upsertServiceProductMapping({ serviceName: "pedicure", productId: productIds[1], quantityRequired: "1" });
  await storage.upsertServiceProductMapping({ serviceName: "wax", productId: productIds[2] ?? productIds[0], quantityRequired: "2" });
}

async function ensureDefaultProducts(productIds: number[]) {
  await storage.upsertOrderDefaultProduct({ productId: productIds[0], quantity: "1" });
  await storage.upsertOrderDefaultProduct({ productId: productIds[1], quantity: "1" });
}

async function ensurePurchases(productIds: number[], createdBy: number | null) {
  const today = new Date().toISOString().slice(0, 10);
  for (const productId of productIds.slice(0, 3)) {
    await storage.createProductPurchase({
      productId,
      quantity: "50",
      purchaseDate: today,
      vendorName: "Test Vendor",
      invoiceNumber: `INV-${productId}-${today}`,
      createdBy,
    });
  }
}

async function pickOrdersForCompletion(beauticianId: number) {
  const candidates = await db.select().from(orders).where(and(
    eq(orders.employeeId, beauticianId),
    ne(orders.status, "completed"),
  )).limit(2);
  return candidates;
}

async function createTestOrder(beauticianId: number, serviceLabel: string) {
  return storage.createOrder({
    customerName: `Auto Deduct ${serviceLabel}`,
    phone: "9999999999",
    address: "Test Address",
    amount: 100,
    duration: 60,
    appointmentTime: new Date(),
    services: [{ name: serviceLabel, price: 10 }],
    paymentMode: "cash",
    status: "confirmed",
    employeeId: beauticianId,
  });
}

async function main() {
  const [beautician] = await db.select().from(employees).where(eq(employees.role, "employee")).limit(1);
  if (!beautician) {
    console.error("[TEST] No employee found");
    process.exit(1);
  }

  const seededProducts = await ensureSeedProducts();
  const productIds = seededProducts.map((p) => p.id);
  await ensureServiceMappings(productIds);
  await ensureDefaultProducts(productIds);
  await ensurePurchases(productIds, beautician.id);

  const ordersToComplete = await pickOrdersForCompletion(beautician.id);
  if (ordersToComplete.length < 2) {
    const missing = 2 - ordersToComplete.length;
    for (let i = 0; i < missing; i++) {
      const newOrder = await createTestOrder(beautician.id, `ghost-${i + 1}`);
      ordersToComplete.push(newOrder);
    }
  }

  const ghostServiceName = "ghost-service";
  const firstOrder = ordersToComplete[0];
  const customServices = [...(firstOrder.services || []), { name: ghostServiceName, price: 0 }];
  await db.update(orders).set({ services: customServices }).where(eq(orders.id, firstOrder.id));
  ordersToComplete[0] = { ...firstOrder, services: customServices };

  for (const order of ordersToComplete) {
    await storage.updateOrderStatus(order.id, "completed");
  }

  const consumptions = await db.select().from(productConsumptions)
    .where(inArray(productConsumptions.orderId, ordersToComplete.map((o) => o.id)));

  if (!consumptions.length) {
    console.error("[TEST] No consumptions generated");
    process.exit(1);
  }

  await storage.createProductRequest({
    beauticianId: beautician.id,
    productId: productIds[0],
    quantityRequested: "2",
    status: "pending",
  });
  await storage.createProductRequest({
    beauticianId: beautician.id,
    productId: productIds[1],
    quantityRequested: "3",
    status: "pending",
  });

  const today = new Date().toISOString().slice(0, 10);
  await storage.createProductPurchase({
    productId: productIds[0],
    quantity: "2",
    purchaseDate: today,
    vendorName: "Request Refill",
    invoiceNumber: `REQ-${Date.now()}-1`,
    createdBy: beautician.id,
  });
  await storage.createProductPurchase({
    productId: productIds[1],
    quantity: "3",
    purchaseDate: today,
    vendorName: "Request Refill",
    invoiceNumber: `REQ-${Date.now()}-2`,
    createdBy: beautician.id,
  });

  const stockA = await storage.getProductStock(productIds[0]);
  const stockB = await storage.getProductStock(productIds[1]);
  console.log(`[TEST] Stock after request purchases: product ${productIds[0]}=${stockA}, product ${productIds[1]}=${stockB}`);
  const missingEntries = await db.select().from(productsNotFound)
    .where(inArray(productsNotFound.orderId, ordersToComplete.map((o) => o.id)));
  if (!missingEntries.length) {
    console.error("[TEST] Missing product log not created");
    process.exit(1);
  }
  console.log("[TEST] Missing product capture successful");
  console.log("[TEST] Auto deduction successful");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
