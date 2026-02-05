import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get current beautician from auth user
  const getBeautician = async (req: any) => {
    if (!req.isAuthenticated()) return null;
    const userId = req.user.claims.sub;
    let beautician = await storage.getBeauticianByUserId(userId);
    if (!beautician) {
      // Auto-create beautician profile for MVP
      beautician = await storage.createBeautician(userId);
    }
    return beautician;
  };

  // Middleware to ensure beautician profile exists
  const requireBeautician = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const beautician = await getBeautician(req);
    if (!beautician) return res.status(500).send("Failed to load profile");
    req.beautician = beautician;
    next();
  };

  // === Beautician Routes ===

  app.get(api.beautician.me.path, requireBeautician, (req: any, res) => {
    res.json(req.beautician);
  });

  app.post(api.beautician.toggleShift.path, requireBeautician, async (req: any, res) => {
    const { action } = req.body;
    const isOnline = action === 'start_shift';
    
    await storage.updateBeauticianStatus(req.beautician.id, isOnline);
    await storage.logAttendance({
      beauticianId: req.beautician.id,
      action
    });

    res.json({ success: true, state: isOnline ? 'online' : 'offline' });
  });

  app.post(api.beautician.updateLocation.path, requireBeautician, async (req: any, res) => {
    const { latitude, longitude } = req.body;
    await storage.updateBeauticianLocation(req.beautician.id, latitude, longitude);
    res.json({ success: true });
  });

  // === Order Routes ===

  app.get(api.orders.list.path, requireBeautician, async (req: any, res) => {
    // In MVP, we just return all orders for the beautician
    // Filtering can happen on frontend or extended here
    const orders = await storage.getOrders(req.beautician.id);
    res.json(orders);
  });

  app.get(api.orders.get.path, requireBeautician, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.patch(api.orders.updateStatus.path, requireBeautician, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  // === Issue Routes ===

  app.post(api.issues.create.path, requireBeautician, async (req: any, res) => {
    const input = api.issues.create.input.parse(req.body);
    const issue = await storage.createIssue({
      ...input,
      beauticianId: req.beautician.id
    });
    res.status(201).json(issue);
  });

  // === Seeding ===
  // Seed some initial data if empty
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  // We can't easily check for existing data without a generic 'count' or specific query
  // For MVP, we'll skip complex seeding logic here and rely on manual entry or
  // add a simple check if we had a dedicated seed script.
  // Actually, let's just seed if no orders exist for a dummy user? 
  // Since we rely on auth users, automatic seeding is tricky without a logged in user.
  // We will leave this for now, or maybe create a dummy order for the first user who logs in?
  // Let's keep it clean.
}
