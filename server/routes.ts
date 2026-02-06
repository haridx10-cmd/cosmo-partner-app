import type { Express, RequestHandler } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { syncFromSheet, startPeriodicSync } from "./sheets-sync";
import { db } from "./db";
import { orders as ordersTable } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === SESSION SETUP ===
  const pgStore = connectPg(session);
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "sessions",
    }),
    secret: process.env.SESSION_SECRET || "salon-at-home-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  // === AUTH MIDDLEWARE ===
  const requireAuth: RequestHandler = (req: any, res, next) => {
    if (!req.session?.employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin: RequestHandler = async (req: any, res, next) => {
    if (!req.session?.employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const emp = await storage.getEmployee(req.session.employeeId);
    if (!emp || emp.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    req.employee = emp;
    next();
  };

  const loadEmployee: RequestHandler = async (req: any, res, next) => {
    if (!req.session?.employeeId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const emp = await storage.getEmployee(req.session.employeeId);
    if (!emp) return res.status(401).json({ message: "Employee not found" });
    req.employee = emp;
    next();
  };

  // === AUTH ROUTES ===

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { identifier, password } = api.auth.login.input.parse(req.body);
      const emp = await storage.findEmployeeByIdentifier(identifier);
      if (!emp) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await bcrypt.compare(password, emp.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      (req.session as any).employeeId = emp.id;
      (req.session as any).role = emp.role;
      const { passwordHash, ...safeEmployee } = emp;
      res.json({ employee: safeEmployee });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get(api.auth.me.path, async (req: any, res) => {
    if (!req.session?.employeeId) return res.status(401).json({ message: "Not logged in" });
    const emp = await storage.getEmployee(req.session.employeeId);
    if (!emp) return res.status(401).json({ message: "Employee not found" });
    const { passwordHash, ...safeEmployee } = emp;
    res.json(safeEmployee);
  });

  app.post(api.auth.logout.path, (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const data = api.auth.register.input.parse(req.body);
      // Check for duplicates
      if (data.mobile) {
        const existing = await storage.findEmployeeByIdentifier(data.mobile);
        if (existing) return res.status(400).json({ message: "Mobile number already registered" });
      }
      if (data.username) {
        const existing = await storage.findEmployeeByIdentifier(data.username);
        if (existing) return res.status(400).json({ message: "Username already taken" });
      }
      if (data.email) {
        const existing = await storage.findEmployeeByIdentifier(data.email);
        if (existing) return res.status(400).json({ message: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(data.password, 10);
      const emp = await storage.createEmployee({
        name: data.name,
        mobile: data.mobile || undefined,
        username: data.username || undefined,
        email: data.email || undefined,
        passwordHash,
        role: data.role || 'employee',
      });
      const { passwordHash: _, ...safeEmployee } = emp;
      res.status(201).json({ employee: safeEmployee });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Registration failed" });
    }
  });

  // === EMPLOYEE ROUTES ===

  app.post(api.employee.toggleShift.path, loadEmployee, async (req: any, res) => {
    const { action } = req.body;
    const isOnline = action === 'start_shift';
    await storage.updateEmployeeStatus(req.employee.id, isOnline);
    if (isOnline) {
      await storage.startShift(req.employee.id);
    } else {
      await storage.endShift(req.employee.id);
    }
    res.json({ success: true, state: isOnline ? 'online' : 'offline' });
  });

  app.post(api.employee.updateLocation.path, loadEmployee, async (req: any, res) => {
    const { latitude, longitude } = req.body;
    await storage.updateEmployeeLocation(req.employee.id, latitude, longitude);
    res.json({ success: true });
  });

  // === ORDER ROUTES ===

  app.get(api.orders.list.path, loadEmployee, async (req: any, res) => {
    const myOrders = await storage.getOrdersForEmployee(req.employee.id);
    res.json(myOrders);
  });

  app.get(api.orders.get.path, loadEmployee, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.patch(api.orders.updateStatus.path, loadEmployee, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  // === ISSUE ROUTES ===

  app.post(api.issues.create.path, loadEmployee, async (req: any, res) => {
    const input = api.issues.create.input.parse(req.body);
    const issue = await storage.createIssue({
      ...input,
      employeeId: req.employee.id,
    });
    res.status(201).json(issue);
  });

  // === ADMIN ROUTES ===

  app.get(api.admin.overview.path, requireAdmin, async (req, res) => {
    const stats = await storage.getOverviewStats();
    res.json(stats);
  });

  app.get(api.admin.allOrders.path, requireAdmin, async (req, res) => {
    const allOrders = await storage.getAllOrders();
    res.json(allOrders);
  });

  app.get(api.admin.allIssues.path, requireAdmin, async (req, res) => {
    const allIssues = await storage.getAllIssues();
    res.json(allIssues);
  });

  app.patch(api.admin.resolveIssue.path, requireAdmin, async (req, res) => {
    const issue = await storage.resolveIssue(Number(req.params.id));
    res.json(issue);
  });

  app.get(api.admin.allEmployees.path, requireAdmin, async (req, res) => {
    const emps = await storage.getAllEmployees();
    const safeEmps = emps.map(({ passwordHash, ...rest }) => rest);
    res.json(safeEmps);
  });

  app.get(api.admin.tracking.path, requireAdmin, async (req, res) => {
    const tracking = await storage.getTrackingData();
    res.json(tracking);
  });

  app.patch(api.admin.assignOrder.path, requireAdmin, async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { employeeId } = api.admin.assignOrder.input.parse(req.body);
      const [updated] = await db.update(ordersTable).set({ employeeId }).where(eq(ordersTable.id, orderId)).returning();
      if (!updated) return res.status(404).json({ message: "Order not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to assign order" });
    }
  });

  app.post(api.admin.syncSheets.path, requireAdmin, async (req, res) => {
    try {
      const { sheetId, range } = req.body;
      if (!sheetId) return res.status(400).json({ message: "Sheet ID is required" });
      const result = await syncFromSheet(sheetId, range || "Sheet1!A2:I");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Sync failed" });
    }
  });

  // Seed on startup
  await seedDatabase();

  // Start periodic Google Sheets sync if configured
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (sheetId) {
    startPeriodicSync(sheetId, process.env.GOOGLE_SHEET_RANGE || "Sheet1!A2:I", 2 * 60 * 1000);
  }

  return httpServer;
}

async function seedDatabase() {
  try {
    const existing = await storage.findEmployeeByIdentifier("admin@salon.com");
    if (existing) return; // Already seeded

    // Create admin
    const adminHash = await bcrypt.hash("admin123", 10);
    const admin = await storage.createEmployee({
      name: "Admin User",
      email: "admin@salon.com",
      username: "admin",
      passwordHash: adminHash,
      role: "admin",
    });

    // Create demo employees
    const empHash = await bcrypt.hash("1234", 10);
    const emp1 = await storage.createEmployee({
      name: "Priya Sharma",
      mobile: "9876543210",
      username: "priya",
      passwordHash: empHash,
      role: "employee",
    });

    const emp2 = await storage.createEmployee({
      name: "Neha Gupta",
      mobile: "9876543211",
      username: "neha",
      passwordHash: empHash,
      role: "employee",
    });

    // Create demo orders for emp1
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await storage.createOrder({
      customerName: "Anita Desai",
      phone: "9123456780",
      address: "Flat 302, Rose Garden Apartments, Bandra West, Mumbai",
      latitude: 19.0544,
      longitude: 72.8402,
      services: [{ name: "Bridal Makeup", price: 5000 }, { name: "Hair Styling", price: 2000 }],
      amount: 7000,
      duration: 120,
      appointmentTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
      paymentMode: "online",
      status: "confirmed",
      employeeId: emp1.id,
    });

    await storage.createOrder({
      customerName: "Meera Patel",
      phone: "9123456781",
      address: "B-105, Sunshine Society, Andheri East, Mumbai",
      latitude: 19.1136,
      longitude: 72.8697,
      services: [{ name: "Facial", price: 1500 }, { name: "Threading", price: 300 }],
      amount: 1800,
      duration: 60,
      appointmentTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      paymentMode: "cash",
      status: "pending",
      employeeId: emp1.id,
    });

    await storage.createOrder({
      customerName: "Ritu Singh",
      phone: "9123456782",
      address: "Tower C, 15th Floor, Hiranandani Gardens, Powai",
      latitude: 19.1197,
      longitude: 72.9051,
      services: [{ name: "Manicure", price: 800 }, { name: "Pedicure", price: 1000 }],
      amount: 1800,
      duration: 90,
      appointmentTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0),
      paymentMode: "online",
      status: "confirmed",
      employeeId: emp1.id,
    });

    // Create demo orders for emp2
    await storage.createOrder({
      customerName: "Kavita Reddy",
      phone: "9123456783",
      address: "201, Green Valley, Thane West",
      latitude: 19.2183,
      longitude: 72.9781,
      services: [{ name: "Full Body Wax", price: 3000 }],
      amount: 3000,
      duration: 90,
      appointmentTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30),
      paymentMode: "cash",
      status: "confirmed",
      employeeId: emp2.id,
    });

    await storage.createOrder({
      customerName: "Sunita Joshi",
      phone: "9123456784",
      address: "D-404, Prestige Towers, Goregaon East",
      latitude: 19.1663,
      longitude: 72.8526,
      services: [{ name: "Hair Color", price: 4000 }, { name: "Hair Spa", price: 1500 }],
      amount: 5500,
      duration: 150,
      appointmentTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
      paymentMode: "online",
      status: "pending",
      employeeId: emp2.id,
    });

    console.log("Database seeded with demo data");
    console.log("Admin login: admin@salon.com / admin123");
    console.log("Employee login: priya / 1234 or neha / 1234");
  } catch (err) {
    console.error("Seed error (may be OK if already seeded):", err);
  }
}
