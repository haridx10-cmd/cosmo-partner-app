import dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";


const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run additive DB migrations on startup (all idempotent via IF NOT EXISTS)
  try {
    const { pool } = await import("./db");
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_upi_profiles (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id),
        upi_number TEXT,
        qr_code_data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auto_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id),
        current_balance NUMERIC NOT NULL DEFAULT 0,
        last_updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auto_balance_ledger (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        balance_after NUMERIC NOT NULL,
        created_by_id INTEGER REFERENCES employees(id),
        related_spend_entry_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_employee ON auto_balance_ledger(employee_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_created ON auto_balance_ledger(created_at);
      CREATE TABLE IF NOT EXISTS spend_entries (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        amount NUMERIC NOT NULL,
        screenshot_data TEXT,
        screenshot_mime TEXT DEFAULT 'image/jpeg',
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'approved',
        reviewed_by_id INTEGER REFERENCES employees(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_spend_employee ON spend_entries(employee_id);
      CREATE INDEX IF NOT EXISTS idx_spend_status ON spend_entries(status);
      CREATE TABLE IF NOT EXISTS top_up_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        requested_amount NUMERIC,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        acknowledged_at TIMESTAMP,
        acknowledged_by_id INTEGER REFERENCES employees(id),
        fulfilled_at TIMESTAMP,
        fulfilled_by_id INTEGER REFERENCES employees(id)
      );
      CREATE INDEX IF NOT EXISTS idx_topup_employee ON top_up_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_topup_status ON top_up_requests(status);
      CREATE TABLE IF NOT EXISTS payment_entries (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        order_id INTEGER REFERENCES orders(id),
        amount NUMERIC NOT NULL,
        payment_mode TEXT NOT NULL DEFAULT 'cash',
        screenshot_data TEXT,
        screenshot_mime TEXT DEFAULT 'image/jpeg',
        notes TEXT,
        customer_name TEXT,
        is_adhoc INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'approved',
        reviewed_by_id INTEGER REFERENCES employees(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pe_employee ON payment_entries(employee_id);
      CREATE INDEX IF NOT EXISTS idx_pe_status ON payment_entries(status);
      CREATE INDEX IF NOT EXISTS idx_pe_created ON payment_entries(created_at);
    `);
    client.release();
    console.log("[Migrations] Auto-balance + payment tables ready");
  } catch (e: any) {
    console.error("[Migrations] Failed:", e.message);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, () => {
    log(`🚀 Server running at http://localhost:${port}`);
  });
  
})();
