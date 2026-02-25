import { google } from "googleapis";
import { storage } from "./storage";

let inventorySyncInterval: NodeJS.Timeout | null = null;

async function getSheetsClient() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return google.sheets({ version: "v4", auth });
  }

  if (apiKey) {
    return google.sheets({ version: "v4", auth: apiKey });
  }

  console.warn("[Inventory Sync] No Google API credentials configured. Skipping inventory sheets sync.");
  return null;
}

async function getSheetRows(sheetId: string, range: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  if (!sheets) return [];
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    return (response.data.values as string[][]) || [];
  } catch (err: any) {
    console.error(`[Inventory Sync] Failed to fetch ${sheetId} (${range}):`, err.message);
    return [];
  }
}

function parseQuantity(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePurchaseDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const parts = trimmed.split(/[\/-]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const y4 = y.length === 2 ? `20${y}` : y;
    const dt = new Date(Number(y4), Number(m) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

async function resolveCreatedBy(raw: string): Promise<number | null> {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const byIdentifier = await storage.findEmployeeByIdentifier(value);
  if (byIdentifier) return byIdentifier.id;
  const byName = await storage.findEmployeeByName(value);
  return byName?.id ?? null;
}

export async function syncProductsMasterFromSheet() {
  const sheetId = process.env.GOOGLE_PRODUCTS_SHEET_ID;
  if (!sheetId) {
    console.warn("[Products Sync] GOOGLE_PRODUCTS_SHEET_ID missing. Skipping.");
    console.log("[Products Sync] complete");
    return;
  }

  const rows = await getSheetRows(sheetId, process.env.GOOGLE_PRODUCTS_SHEET_RANGE || "Sheet1!A2:D");
  let count = 0;
  for (const row of rows) {
    const name = (row[0] || "").trim();
    const unit = (row[1] || "").trim();
    const costPerUnit = (row[2] || "").trim();
    const lowStockThreshold = (row[3] || "0").trim();
    if (!name || !unit || !costPerUnit) continue;
    try {
      await storage.upsertProductByName({ name, unit, costPerUnit, lowStockThreshold });
      count++;
    } catch (err: any) {
      console.error("[Products Sync] Row error:", err.message);
    }
  }
  console.log(`[Products Sync] complete (${count} upserts)`);
}

export async function syncPurchasesFromSheet() {
  const sheetId = process.env.GOOGLE_PRODUCT_PURCHASES_SHEET_ID;
  if (!sheetId) {
    console.warn("[Purchases Sync] GOOGLE_PRODUCT_PURCHASES_SHEET_ID missing. Skipping.");
    console.log("[Purchases Sync] complete");
    return;
  }

  const rows = await getSheetRows(sheetId, "Sheet1!A2:F");
  let count = 0;
  for (const row of rows) {
    const productName = (row[0] || "").trim();
    const quantity = parseQuantity((row[1] || "").trim());
    const purchaseDate = parsePurchaseDate((row[2] || "").trim());
    const vendorName = (row[3] || "").trim() || null;
    const invoiceNumber = (row[4] || "").trim() || null;
    const createdByRaw = (row[5] || "").trim();
    if (!productName || quantity <= 0) continue;

    try {
      const product = await storage.getProductByName(productName);
      if (!product) {
        console.warn(`[Purchases Sync] Product not found: ${productName}`);
        continue;
      }
      const createdBy = await resolveCreatedBy(createdByRaw);
      await storage.createProductPurchase({
        productId: product.id,
        quantity: String(quantity),
        purchaseDate,
        vendorName,
        invoiceNumber,
        createdBy,
      });
      count++;
    } catch (err: any) {
      console.error("[Purchases Sync] Row error:", err.message);
    }
  }
  console.log(`[Purchases Sync] complete (${count} inserts checked)`);
}

export async function syncServiceProductMappingsFromSheet() {
  const sheetId = process.env.GOOGLE_SERVICE_PRODUCT_MAPPING_SHEET_ID;
  if (!sheetId) {
    console.warn("[Mapping Sync] GOOGLE_SERVICE_PRODUCT_MAPPING_SHEET_ID missing. Skipping.");
    console.log("[Mapping Sync] complete");
    return;
  }

  const rows = await getSheetRows(sheetId, "Sheet1!A2:C");
  let count = 0;
  for (const row of rows) {
    const serviceName = (row[0] || "").trim().toLowerCase();
    const productName = (row[1] || "").trim();
    const quantityRequired = parseQuantity((row[2] || "").trim());
    if (!serviceName || !productName || quantityRequired <= 0) continue;

    try {
      const product = await storage.getProductByName(productName);
      if (!product) {
        console.warn(`[Mapping Sync] Product not found: ${productName}`);
        continue;
      }
      await storage.upsertServiceProductMapping({
        serviceName,
        productId: product.id,
        quantityRequired: String(quantityRequired),
      });
      count++;
    } catch (err: any) {
      console.error("[Mapping Sync] Row error:", err.message);
    }
  }
  console.log(`[Mapping Sync] complete (${count} upserts)`);
}

export async function syncOrderDefaultProductsFromSheet() {
  const sheetId = process.env.GOOGLE_ORDER_DEFAULT_PRODUCTS_SHEET_ID;
  if (!sheetId) {
    console.warn("[Order Defaults Sync] GOOGLE_ORDER_DEFAULT_PRODUCTS_SHEET_ID missing. Skipping.");
    console.log("[Order Defaults Sync] complete");
    return;
  }

  const rows = await getSheetRows(sheetId, "Sheet1!A2:B");
  let count = 0;
  for (const row of rows) {
    const productName = (row[0] || "").trim();
    const quantity = parseQuantity((row[1] || "").trim());
    if (!productName || quantity <= 0) continue;

    try {
      const product = await storage.getProductByName(productName);
      if (!product) {
        console.warn(`[Order Defaults Sync] Product not found: ${productName}`);
        continue;
      }
      await storage.upsertOrderDefaultProduct({
        productId: product.id,
        quantity: String(quantity),
      });
      count++;
    } catch (err: any) {
      console.error("[Order Defaults Sync] Row error:", err.message);
    }
  }
  console.log(`[Order Defaults Sync] complete (${count} upserts)`);
}

export async function syncAllInventorySheets() {
  await syncProductsMasterFromSheet();
  await syncPurchasesFromSheet();
  await syncServiceProductMappingsFromSheet();
  await syncOrderDefaultProductsFromSheet();
}

export function startPeriodicInventorySheetsSync(intervalMs = 2 * 60 * 1000) {
  if (inventorySyncInterval) clearInterval(inventorySyncInterval);
  syncAllInventorySheets();
  inventorySyncInterval = setInterval(() => {
    syncAllInventorySheets();
  }, intervalMs);
}
