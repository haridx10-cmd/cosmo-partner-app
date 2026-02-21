import { google } from "googleapis";
import { storage } from "./storage";

let productsSyncInterval: NodeJS.Timeout | null = null;

async function getSheetData(sheetId: string, range: string): Promise<string[][] | null> {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    let sheets;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      sheets = google.sheets({ version: "v4", auth });
    } else if (apiKey) {
      sheets = google.sheets({ version: "v4", auth: apiKey });
    } else {
      console.log("[Products Sync] No Google API credentials configured. Skipping sync.");
      return null;
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    return (response.data.values as string[][]) || null;
  } catch (err: any) {
    console.error("[Products Sync] Failed to fetch products sheet:", err.message);
    return null;
  }
}

export async function syncProductsFromSheet(
  sheetId: string,
  range = "Sheet1!A2:D",
): Promise<{ importedOrUpdated: number; errors: number }> {
  const result = { importedOrUpdated: 0, errors: 0 };
  const rows = await getSheetData(sheetId, range);
  if (!rows?.length) return result;

  for (const row of rows) {
    try {
      const name = (row[0] || "").trim();
      const unit = (row[1] || "").trim();
      const costPerUnit = (row[2] || "").trim();
      const lowStockThreshold = (row[3] || "0").trim();
      if (!name || !unit || !costPerUnit) continue;

      await storage.upsertProductByName({
        name,
        unit,
        costPerUnit,
        lowStockThreshold,
      });
      result.importedOrUpdated++;
    } catch (err: any) {
      result.errors++;
      console.error("[Products Sync] Row error:", err.message);
    }
  }

  console.log(`[Products Sync] Sync complete: ${result.importedOrUpdated} upserts, ${result.errors} errors`);
  return result;
}

export function startPeriodicProductsSync(
  sheetId: string,
  range = "Sheet1!A2:D",
  intervalMs = 2 * 60 * 1000,
) {
  if (productsSyncInterval) clearInterval(productsSyncInterval);
  console.log(`[Products Sync] Starting periodic sync every ${intervalMs / 1000}s for sheet: ${sheetId}`);
  syncProductsFromSheet(sheetId, range);
  productsSyncInterval = setInterval(() => {
    syncProductsFromSheet(sheetId, range);
  }, intervalMs);
}

