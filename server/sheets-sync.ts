import { google } from "googleapis";
import { storage } from "./storage";
import { randomUUID } from "crypto";

let syncInterval: NodeJS.Timeout | null = null;

interface SheetRow {
  rowIndex: number;
  customerName: string;
  phone: string;
  address: string;
  services: string;
  amount: number;
  appointmentDate: string;
  appointmentTime: string;
  paymentMode: string;
  employeeName: string;
  mapsUrl: string;
  orderNum: number | null;
  areaName: string;
  externalOrderId: string;
}

function parseServices(servicesStr: string): { name: string; price: number }[] {
  if (!servicesStr) return [];
  const delimiter = servicesStr.includes("-") ? "-" : ",";
  return servicesStr.split(delimiter).map(s => {
    const trimmed = s.trim();
    const match = trimmed.match(/^(.+?)\s*[-–]\s*(\d+)$/);
    if (match) {
      return { name: match[1].trim(), price: parseInt(match[2]) };
    }
    return { name: trimmed, price: 0 };
  });
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  try {
    const combined = `${dateStr} ${timeStr}`;
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) return parsed;

    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const ampm = timeParts[3];
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        return new Date(parseInt(year.length === 2 ? `20${year}` : year), parseInt(month) - 1, parseInt(day), hours, minutes);
      }
    }

    return new Date();
  } catch {
    return new Date();
  }
}

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
      console.log("[Sheets Sync] No Google API credentials configured. Skipping sync.");
      return null;
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    return response.data.values as string[][] || null;
  } catch (err: any) {
    console.error("[Sheets Sync] Failed to fetch sheet data:", err.message);
    return null;
  }
}

function extractMapsUrlFromText(text: string): string | null {
  const urlMatch = text.match(/(https?:\/\/[^\s]*google\.com\/maps[^\s]*)/i) 
    || text.match(/(https?:\/\/maps\.app\.goo\.gl[^\s]*)/i)
    || text.match(/(https?:\/\/goo\.gl\/maps[^\s]*)/i);
  return urlMatch ? urlMatch[1] : null;
}

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/place\/[^/]*\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function rowToSheetRow(row: string[], rowIndex: number): SheetRow | null {
  if (row.length < 6) return null;
  const address = row[2]?.trim() || "";
  let mapsUrl = row[9]?.trim() || "";
  if (!mapsUrl) {
    const embeddedUrl = extractMapsUrlFromText(address);
    if (embeddedUrl) mapsUrl = embeddedUrl;
  }
  const rawOrderNum = row[10]?.trim();
  const orderNum = rawOrderNum ? parseInt(rawOrderNum) : null;
  const areaName = row[11]?.trim() || "";
  const externalOrderId = row[12]?.trim() || randomUUID();

  return {
    rowIndex,
    customerName: row[0]?.trim() || "",
    phone: row[1]?.trim() || "",
    address,
    services: row[3]?.trim() || "",
    amount: parseInt(row[4]?.trim() || "0") || 0,
    appointmentDate: row[5]?.trim() || "",
    appointmentTime: row[6]?.trim() || "10:00 AM",
    paymentMode: row[7]?.trim() || "cash",
    employeeName: row[8]?.trim() || "",
    mapsUrl,
    orderNum: orderNum && !isNaN(orderNum) ? orderNum : null,
    areaName,
    externalOrderId,
  };
}

export async function syncFromSheet(sheetId: string, range: string = "Sheet1!A2:M"): Promise<{ imported: number; updated: number; errors: number }> {
  const result = { imported: 0, updated: 0, errors: 0 };

  const rows = await getSheetData(sheetId, range);
  if (!rows || rows.length === 0) {
    console.log("[Sheets Sync] No data found in sheet.");
    return result;
  }

  for (let i = 0; i < rows.length; i++) {
    try {
      const sheetRow = rowToSheetRow(rows[i], i + 2);
      if (!sheetRow || !sheetRow.customerName || !sheetRow.phone) continue;

      const sheetRowId = `${sheetId}_row_${sheetRow.rowIndex}`;

      let employeeId: number | undefined;
      if (sheetRow.employeeName) {
        const employee = await storage.findEmployeeByName(sheetRow.employeeName);
        if (employee) employeeId = employee.id;
      }

      const appointmentTime = parseDateTime(sheetRow.appointmentDate, sheetRow.appointmentTime);
      const services = parseServices(sheetRow.services);
      const totalAmount = sheetRow.amount || services.reduce((sum, s) => sum + s.price, 0);

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (sheetRow.mapsUrl) {
        const coords = extractCoordsFromMapsUrl(sheetRow.mapsUrl);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      const existing = await storage.getOrderBySheetRowId(sheetRowId);
      if (existing) {
        const updateData: any = {
          customerName: sheetRow.customerName,
          phone: sheetRow.phone,
          address: sheetRow.address,
          mapsUrl: sheetRow.mapsUrl || undefined,
          latitude: latitude ?? existing.latitude ?? undefined,
          longitude: longitude ?? existing.longitude ?? undefined,
          services,
          amount: totalAmount,
          appointmentTime,
          paymentMode: sheetRow.paymentMode,
          employeeId,
          sheetDate: sheetRow.appointmentDate,
          sheetTime: sheetRow.appointmentTime,
          areaName: sheetRow.areaName || existing.areaName || existing.orderAreaName || undefined,
          orderAreaName: sheetRow.areaName || existing.orderAreaName || undefined,
          externalOrderId: sheetRow.externalOrderId || existing.externalOrderId || undefined,
        };
        if (sheetRow.orderNum !== null && existing.orderNum === null) {
          updateData.orderNum = sheetRow.orderNum;
        }
        await storage.updateOrder(existing.id, updateData);
        result.updated++;
      } else {
        await storage.createOrder({
          customerName: sheetRow.customerName,
          phone: sheetRow.phone,
          address: sheetRow.address,
          mapsUrl: sheetRow.mapsUrl || undefined,
          latitude,
          longitude,
          services,
          amount: totalAmount,
          duration: 60,
          appointmentTime,
          paymentMode: sheetRow.paymentMode,
          status: "pending",
          employeeId,
          sheetRowId,
          sheetDate: sheetRow.appointmentDate,
          sheetTime: sheetRow.appointmentTime,
          orderNum: sheetRow.orderNum,
          areaName: sheetRow.areaName || undefined,
          orderAreaName: sheetRow.areaName || undefined,
          externalOrderId: sheetRow.externalOrderId,
        });
        result.imported++;
      }
    } catch (err: any) {
      console.error(`[Sheets Sync] Error processing row ${i + 2}:`, err.message);
      result.errors++;
    }
  }

  console.log(`[Sheets Sync] Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`);
  return result;
}

export function startPeriodicSync(sheetId: string, range?: string, intervalMs: number = 2 * 60 * 1000) {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log(`[Sheets Sync] Starting periodic sync every ${intervalMs / 1000}s for sheet: ${sheetId}`);

  syncFromSheet(sheetId, range);

  syncInterval = setInterval(() => {
    syncFromSheet(sheetId, range);
  }, intervalMs);
}

export function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[Sheets Sync] Periodic sync stopped.");
  }
}
