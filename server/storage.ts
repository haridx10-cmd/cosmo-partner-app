import { db } from "./db";
import {
  users, beauticians, orders, issues, attendance, locationHistory,
  type Beautician, type Order, type Issue, type Attendance, type InsertIssue,
  type InsertAttendance, type InsertLocation, type InsertOrder
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Beautician
  getBeauticianByUserId(userId: string): Promise<Beautician | undefined>;
  createBeautician(userId: string): Promise<Beautician>;
  updateBeauticianStatus(id: number, isOnline: boolean): Promise<Beautician>;
  updateBeauticianLocation(id: number, lat: number, lng: number): Promise<void>;

  // Orders
  getOrders(beauticianId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  createOrder(order: InsertOrder): Promise<Order>; // For seeding

  // Issues
  createIssue(issue: InsertIssue): Promise<Issue>;

  // Attendance
  logAttendance(entry: InsertAttendance): Promise<Attendance>;
}

export class DatabaseStorage implements IStorage {
  async getBeauticianByUserId(userId: string): Promise<Beautician | undefined> {
    const [beautician] = await db.select().from(beauticians).where(eq(beauticians.userId, userId));
    return beautician;
  }

  async createBeautician(userId: string): Promise<Beautician> {
    const [beautician] = await db.insert(beauticians).values({ userId }).returning();
    return beautician;
  }

  async updateBeauticianStatus(id: number, isOnline: boolean): Promise<Beautician> {
    const [beautician] = await db.update(beauticians)
      .set({ isOnline })
      .where(eq(beauticians.id, id))
      .returning();
    return beautician;
  }

  async updateBeauticianLocation(id: number, lat: number, lng: number): Promise<void> {
    await db.update(beauticians)
      .set({
        currentLatitude: lat,
        currentLongitude: lng,
        lastLocationUpdate: new Date()
      })
      .where(eq(beauticians.id, id));

    // Log history
    await db.insert(locationHistory).values({
      beauticianId: id,
      latitude: lat,
      longitude: lng
    });
  }

  async getOrders(beauticianId: number): Promise<Order[]> {
    return await db.select()
      .from(orders)
      .where(eq(orders.beauticianId, beauticianId))
      .orderBy(desc(orders.appointmentTime));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [newIssue] = await db.insert(issues).values(issue).returning();
    return newIssue;
  }

  async logAttendance(entry: InsertAttendance): Promise<Attendance> {
    const [log] = await db.insert(attendance).values(entry).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
