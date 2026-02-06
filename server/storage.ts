import { db } from "./db";
import {
  employees, orders, issues, attendance, locationHistory, beauticianLiveTracking,
  type Employee, type Order, type Issue, type Attendance, type LiveTracking,
  type InsertIssue, type InsertOrder, type InsertLiveTracking
} from "@shared/schema";
import { eq, and, desc, sql, or, like, gte, lte, lt, isNull } from "drizzle-orm";

export interface IStorage {
  // Auth
  findEmployeeByIdentifier(identifier: string): Promise<Employee | undefined>;
  createEmployee(data: { name: string; mobile?: string; username?: string; email?: string; passwordHash: string; role: string }): Promise<Employee>;
  getEmployee(id: number): Promise<Employee | undefined>;

  // Employee actions
  updateEmployeeStatus(id: number, isOnline: boolean): Promise<Employee>;
  updateEmployeeLocation(id: number, lat: number, lng: number): Promise<void>;

  // Orders
  getOrdersForEmployee(employeeId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderBySheetRowId(sheetRowId: string): Promise<Order | undefined>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order>;
  findEmployeeByName(name: string): Promise<Employee | undefined>;

  // Issues
  createIssue(issue: InsertIssue): Promise<Issue>;
  resolveIssue(id: number): Promise<Issue>;

  // Attendance
  startShift(employeeId: number): Promise<Attendance>;
  endShift(employeeId: number): Promise<Attendance | undefined>;

  // Live Tracking
  insertLiveTracking(data: InsertLiveTracking): Promise<LiveTracking>;
  getLatestTrackingForBeautician(beauticianId: number): Promise<LiveTracking | undefined>;
  getTrackingHistoryForBeautician(beauticianId: number, since?: Date): Promise<LiveTracking[]>;
  getTrackingHistoryForOrder(orderId: number): Promise<LiveTracking[]>;
  cleanupOldTrackingData(olderThan: Date): Promise<number>;

  // Admin
  getAllOrders(): Promise<{ order: Order; employeeName: string | null }[]>;
  getAllIssues(): Promise<{ issue: Issue; employeeName: string | null; orderDetails: Order | null }[]>;
  getAllEmployees(): Promise<Employee[]>;
  getOverviewStats(): Promise<{ totalEmployees: number; activeEmployees: number; totalOrders: number; openIssues: number; completedToday: number }>;
  getTrackingData(): Promise<{ id: number; name: string; isOnline: boolean | null; currentLatitude: number | null; currentLongitude: number | null; hasActiveIssue: boolean; currentOrderStatus: string | null }[]>;
}

export class DatabaseStorage implements IStorage {
  async findEmployeeByIdentifier(identifier: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(
      or(
        eq(employees.mobile, identifier),
        eq(employees.username, identifier),
        eq(employees.email, identifier)
      )
    );
    return emp;
  }

  async createEmployee(data: { name: string; mobile?: string; username?: string; email?: string; passwordHash: string; role: string }): Promise<Employee> {
    const [emp] = await db.insert(employees).values(data).returning();
    return emp;
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  async updateEmployeeStatus(id: number, isOnline: boolean): Promise<Employee> {
    const [emp] = await db.update(employees)
      .set({ isOnline, lastActiveTime: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return emp;
  }

  async updateEmployeeLocation(id: number, lat: number, lng: number): Promise<void> {
    await db.update(employees)
      .set({ currentLatitude: lat, currentLongitude: lng, lastActiveTime: new Date() })
      .where(eq(employees.id, id));
    await db.insert(locationHistory).values({ employeeId: id, latitude: lat, longitude: lng });
  }

  async getOrdersForEmployee(employeeId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.employeeId, employeeId))
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

  async getOrderBySheetRowId(sheetRowId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.sheetRowId, sheetRowId));
    return order;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order;
  }

  async findEmployeeByName(name: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees)
      .where(sql`LOWER(${employees.name}) = LOWER(${name})`);
    return emp;
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [newIssue] = await db.insert(issues).values(issue).returning();
    // Mark order as having an issue
    if (issue.orderId) {
      await db.update(orders).set({ hasIssue: true }).where(eq(orders.id, issue.orderId));
    }
    return newIssue;
  }

  async resolveIssue(id: number): Promise<Issue> {
    const [resolved] = await db.update(issues)
      .set({ status: 'resolved' })
      .where(eq(issues.id, id))
      .returning();
    return resolved;
  }

  async startShift(employeeId: number): Promise<Attendance> {
    const [entry] = await db.insert(attendance)
      .values({ employeeId, shiftStart: new Date(), status: 'active' })
      .returning();
    return entry;
  }

  async endShift(employeeId: number): Promise<Attendance | undefined> {
    // Find the active shift and end it
    const [active] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.status, 'active')))
      .orderBy(desc(attendance.shiftStart))
      .limit(1);
    if (!active) return undefined;
    const [ended] = await db.update(attendance)
      .set({ shiftEnd: new Date(), status: 'ended' })
      .where(eq(attendance.id, active.id))
      .returning();
    return ended;
  }

  async getAllOrders(): Promise<{ order: Order; employeeName: string | null }[]> {
    const rows = await db.select({
      order: orders,
      employeeName: employees.name
    }).from(orders)
      .leftJoin(employees, eq(orders.employeeId, employees.id))
      .orderBy(desc(orders.appointmentTime));
    return rows;
  }

  async getAllIssues(): Promise<{ issue: Issue; employeeName: string | null; orderDetails: Order | null }[]> {
    const rows = await db.select({
      issue: issues,
      employeeName: employees.name,
      orderDetails: orders
    }).from(issues)
      .leftJoin(employees, eq(issues.employeeId, employees.id))
      .leftJoin(orders, eq(issues.orderId, orders.id))
      .orderBy(desc(issues.createdAt));
    return rows;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(employees.name);
  }

  async getOverviewStats(): Promise<{ totalEmployees: number; activeEmployees: number; totalOrders: number; openIssues: number; completedToday: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees).where(eq(employees.role, 'employee'));
    const [activeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees).where(and(eq(employees.isOnline, true), eq(employees.role, 'employee')));
    const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
    const [issueCount] = await db.select({ count: sql<number>`count(*)::int` }).from(issues).where(eq(issues.status, 'open'));
    const [completedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, 'completed'), gte(orders.appointmentTime, today)));

    return {
      totalEmployees: empCount.count,
      activeEmployees: activeCount.count,
      totalOrders: orderCount.count,
      openIssues: issueCount.count,
      completedToday: completedCount.count,
    };
  }

  async insertLiveTracking(data: InsertLiveTracking): Promise<LiveTracking> {
    const [record] = await db.insert(beauticianLiveTracking).values(data).returning();
    return record;
  }

  async getLatestTrackingForBeautician(beauticianId: number): Promise<LiveTracking | undefined> {
    const [record] = await db.select().from(beauticianLiveTracking)
      .where(eq(beauticianLiveTracking.beauticianId, beauticianId))
      .orderBy(desc(beauticianLiveTracking.timestamp))
      .limit(1);
    return record;
  }

  async getTrackingHistoryForBeautician(beauticianId: number, since?: Date): Promise<LiveTracking[]> {
    const conditions = [eq(beauticianLiveTracking.beauticianId, beauticianId)];
    if (since) {
      conditions.push(gte(beauticianLiveTracking.timestamp, since));
    }
    return await db.select().from(beauticianLiveTracking)
      .where(and(...conditions))
      .orderBy(desc(beauticianLiveTracking.timestamp));
  }

  async getTrackingHistoryForOrder(orderId: number): Promise<LiveTracking[]> {
    return await db.select().from(beauticianLiveTracking)
      .where(eq(beauticianLiveTracking.orderId, orderId))
      .orderBy(desc(beauticianLiveTracking.timestamp));
  }

  async cleanupOldTrackingData(olderThan: Date): Promise<number> {
    const result = await db.delete(beauticianLiveTracking)
      .where(lt(beauticianLiveTracking.timestamp, olderThan));
    return result.rowCount ?? 0;
  }

  async getTrackingData(): Promise<{ id: number; name: string; isOnline: boolean | null; currentLatitude: number | null; currentLongitude: number | null; hasActiveIssue: boolean; currentOrderStatus: string | null }[]> {
    const emps = await db.select().from(employees).where(eq(employees.role, 'employee'));
    const result = [];
    for (const emp of emps) {
      const [openIssue] = await db.select({ count: sql<number>`count(*)::int` }).from(issues)
        .where(and(eq(issues.employeeId, emp.id), eq(issues.status, 'open')));
      // Get current order status
      const [currentOrder] = await db.select().from(orders)
        .where(and(eq(orders.employeeId, emp.id), eq(orders.status, 'confirmed')))
        .orderBy(desc(orders.appointmentTime))
        .limit(1);
      result.push({
        id: emp.id,
        name: emp.name,
        isOnline: emp.isOnline,
        currentLatitude: emp.currentLatitude,
        currentLongitude: emp.currentLongitude,
        hasActiveIssue: openIssue.count > 0,
        currentOrderStatus: currentOrder?.status || null,
      });
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
