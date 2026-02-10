import { db } from "./db";
import {
  employees, orders, issues, attendance, locationHistory, beauticianLiveTracking, orderServiceSessions,
  type Employee, type Order, type Issue, type Attendance, type LiveTracking, type ServiceSession,
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

  // Service Sessions
  startServiceSession(orderId: number, beauticianId: number, expectedDurationMinutes: number): Promise<ServiceSession>;
  stopServiceSession(sessionId: number): Promise<ServiceSession>;
  getActiveSessionForOrder(orderId: number): Promise<ServiceSession | undefined>;
  getActiveSessionForBeautician(beauticianId: number): Promise<ServiceSession | undefined>;
  getAllActiveSessions(): Promise<ServiceSession[]>;

  // Admin
  getAllOrders(): Promise<{ order: Order; employeeName: string | null }[]>;
  getAllIssues(): Promise<{ issue: Issue; employeeName: string | null; orderDetails: Order | null }[]>;
  getAllEmployees(): Promise<Employee[]>;
  getOverviewStats(): Promise<{ totalEmployees: number; activeEmployees: number; totalOrders: number; openIssues: number; completedToday: number }>;
  getTrackingData(): Promise<{ id: number; name: string; isOnline: boolean | null; currentLatitude: number | null; currentLongitude: number | null; hasActiveIssue: boolean; currentOrderStatus: string | null; lastTrackingTime: string | null; lastSpeed: number | null; lastStatus: string | null; activeOrderId: number | null; activeOrderCustomer: string | null; serviceSessionId: number | null; serviceStartTime: string | null; expectedDurationMinutes: number | null }[]>;

  // Date-filtered admin methods
  getOverviewStatsFiltered(startDate: Date, endDate: Date): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    ongoingOrders: number;
    openIssues: number;
    delayedOrders: number;
    completedOrders: number;
    completedValue: number;
    availableBeauticians: number;
  }>;
  getAllOrdersFiltered(startDate: Date, endDate: Date): Promise<{ order: Order; employeeName: string | null }[]>;
  getAllIssuesFiltered(startDate: Date, endDate: Date): Promise<{ issue: Issue; employeeName: string | null; orderDetails: Order | null }[]>;
  getBeauticiansData(date: Date): Promise<{ id: number; name: string; mobile: string | null; status: string; latitude: number | null; longitude: number | null; slot1: string; slot2: string; slot3: string; nextSlotArea: string | null; lastSlot: boolean; totalOrders: number }[]>;
  getRoutingData(date: Date): Promise<any[]>;
  updateOrderAcceptanceStatus(id: number, status: string): Promise<Order>;
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

  async startServiceSession(orderId: number, beauticianId: number, expectedDurationMinutes: number): Promise<ServiceSession> {
    const [session] = await db.insert(orderServiceSessions).values({
      orderId,
      beauticianId,
      serviceStartTime: new Date(),
      expectedDurationMinutes,
      status: 'active',
    }).returning();
    return session;
  }

  async stopServiceSession(sessionId: number): Promise<ServiceSession> {
    const [session] = await db.update(orderServiceSessions)
      .set({ serviceEndTime: new Date(), status: 'completed' })
      .where(eq(orderServiceSessions.id, sessionId))
      .returning();
    return session;
  }

  async getActiveSessionForOrder(orderId: number): Promise<ServiceSession | undefined> {
    const [session] = await db.select().from(orderServiceSessions)
      .where(and(eq(orderServiceSessions.orderId, orderId), eq(orderServiceSessions.status, 'active')))
      .orderBy(desc(orderServiceSessions.serviceStartTime))
      .limit(1);
    return session;
  }

  async getActiveSessionForBeautician(beauticianId: number): Promise<ServiceSession | undefined> {
    const [session] = await db.select().from(orderServiceSessions)
      .where(and(eq(orderServiceSessions.beauticianId, beauticianId), eq(orderServiceSessions.status, 'active')))
      .orderBy(desc(orderServiceSessions.serviceStartTime))
      .limit(1);
    return session;
  }

  async getAllActiveSessions(): Promise<ServiceSession[]> {
    return await db.select().from(orderServiceSessions)
      .where(eq(orderServiceSessions.status, 'active'));
  }

  async getTrackingData(): Promise<{ id: number; name: string; isOnline: boolean | null; currentLatitude: number | null; currentLongitude: number | null; hasActiveIssue: boolean; currentOrderStatus: string | null; lastTrackingTime: string | null; lastSpeed: number | null; lastStatus: string | null; activeOrderId: number | null; activeOrderCustomer: string | null; serviceSessionId: number | null; serviceStartTime: string | null; expectedDurationMinutes: number | null }[]> {
    const emps = await db.select().from(employees).where(eq(employees.role, 'employee'));
    const result = [];
    for (const emp of emps) {
      const [openIssue] = await db.select({ count: sql<number>`count(*)::int` }).from(issues)
        .where(and(eq(issues.employeeId, emp.id), eq(issues.status, 'open')));
      const [currentOrder] = await db.select().from(orders)
        .where(and(eq(orders.employeeId, emp.id), or(eq(orders.status, 'confirmed'), eq(orders.status, 'in_progress'))))
        .orderBy(desc(orders.appointmentTime))
        .limit(1);

      const [latestTracking] = await db.select().from(beauticianLiveTracking)
        .where(eq(beauticianLiveTracking.beauticianId, emp.id))
        .orderBy(desc(beauticianLiveTracking.timestamp))
        .limit(1);

      const lat = latestTracking?.latitude ?? emp.currentLatitude;
      const lng = latestTracking?.longitude ?? emp.currentLongitude;

      const [activeService] = await db.select().from(orderServiceSessions)
        .where(and(eq(orderServiceSessions.beauticianId, emp.id), eq(orderServiceSessions.status, 'active')))
        .orderBy(desc(orderServiceSessions.serviceStartTime))
        .limit(1);

      result.push({
        id: emp.id,
        name: emp.name,
        isOnline: emp.isOnline,
        currentLatitude: lat,
        currentLongitude: lng,
        hasActiveIssue: openIssue.count > 0,
        currentOrderStatus: currentOrder?.status || null,
        lastTrackingTime: latestTracking?.timestamp?.toISOString() || null,
        lastSpeed: latestTracking?.speed ?? null,
        lastStatus: latestTracking?.status ?? null,
        activeOrderId: currentOrder?.id ?? null,
        activeOrderCustomer: currentOrder?.customerName ?? null,
        serviceSessionId: activeService?.id ?? null,
        serviceStartTime: activeService?.serviceStartTime?.toISOString() ?? null,
        expectedDurationMinutes: activeService?.expectedDurationMinutes ?? null,
      });
    }
    return result;
  }

  async getOverviewStatsFiltered(startDate: Date, endDate: Date) {
    const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees).where(eq(employees.role, 'employee'));
    const [activeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees).where(and(eq(employees.isOnline, true), eq(employees.role, 'employee')));

    const [ongoingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders)
      .where(and(
        or(eq(orders.status, 'confirmed'), eq(orders.status, 'in_progress')),
        gte(orders.appointmentTime, startDate),
        lte(orders.appointmentTime, endDate)
      ));

    const [issueCount] = await db.select({ count: sql<number>`count(*)::int` }).from(issues)
      .where(and(eq(issues.status, 'open'), gte(issues.createdAt, startDate), lte(issues.createdAt, endDate)));

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const [delayedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders)
      .where(and(
        lte(orders.appointmentTime, fifteenMinsAgo),
        sql`${orders.status} != 'completed'`,
        sql`${orders.status} != 'cancelled'`,
        gte(orders.appointmentTime, startDate),
        lte(orders.appointmentTime, endDate)
      ));

    const [completedStats] = await db.select({
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`COALESCE(sum(${orders.amount}), 0)::int`
    }).from(orders).where(and(
      eq(orders.status, 'completed'),
      gte(orders.appointmentTime, startDate),
      lte(orders.appointmentTime, endDate)
    ));

    const [availableCount] = await db.select({ count: sql<number>`count(*)::int` }).from(employees)
      .where(and(
        eq(employees.role, 'employee'),
        eq(employees.isOnline, true),
        sql`${employees.id} NOT IN (SELECT employee_id FROM orders WHERE status = 'in_progress' AND employee_id IS NOT NULL)`
      ));

    return {
      totalEmployees: empCount.count,
      activeEmployees: activeCount.count,
      ongoingOrders: ongoingCount.count,
      openIssues: issueCount.count,
      delayedOrders: delayedCount.count,
      completedOrders: completedStats.count,
      completedValue: completedStats.totalValue,
      availableBeauticians: availableCount.count,
    };
  }

  async getAllOrdersFiltered(startDate: Date, endDate: Date) {
    const rows = await db.select({
      order: orders,
      employeeName: employees.name
    }).from(orders)
      .leftJoin(employees, eq(orders.employeeId, employees.id))
      .where(and(gte(orders.appointmentTime, startDate), lte(orders.appointmentTime, endDate)))
      .orderBy(desc(orders.appointmentTime));
    return rows;
  }

  async getAllIssuesFiltered(startDate: Date, endDate: Date) {
    const rows = await db.select({
      issue: issues,
      employeeName: employees.name,
      orderDetails: orders
    }).from(issues)
      .leftJoin(employees, eq(issues.employeeId, employees.id))
      .leftJoin(orders, eq(issues.orderId, orders.id))
      .where(and(gte(issues.createdAt, startDate), lte(issues.createdAt, endDate)))
      .orderBy(desc(issues.createdAt));
    return rows;
  }

  async getBeauticiansData(date: Date) {
    const emps = await db.select().from(employees).where(eq(employees.role, 'employee'));
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayOrders = await db.select({
      order: orders,
      employeeName: employees.name,
    }).from(orders)
      .leftJoin(employees, eq(orders.employeeId, employees.id))
      .where(and(gte(orders.appointmentTime, dayStart), lte(orders.appointmentTime, dayEnd)));

    return emps.map(emp => {
      const empOrders = dayOrders.filter(o => o.order.employeeId === emp.id);
      const activeOrder = empOrders.find(o => o.order.status === 'in_progress');

      let status = emp.isOnline ? 'online' : 'offline';
      if (activeOrder) status = 'on_job';

      const getSlot = (slotStart: number, slotEnd: number) => {
        const hasOrder = empOrders.some(o => {
          const h = new Date(o.order.appointmentTime).getHours();
          return h >= slotStart && h < slotEnd;
        });
        return hasOrder ? 'N' : 'Y';
      };

      const slot1 = getSlot(10, 12);
      const slot2 = getSlot(12, 15);
      const slot3 = getSlot(15, 19);

      const now = new Date();
      const futureOrders = empOrders
        .filter(o => new Date(o.order.appointmentTime) > now)
        .sort((a, b) => new Date(a.order.appointmentTime).getTime() - new Date(b.order.appointmentTime).getTime());
      const nextOrder = futureOrders[0];

      const lastSlot = futureOrders.length <= 1;

      return {
        id: emp.id,
        name: emp.name,
        mobile: emp.mobile,
        status,
        latitude: emp.currentLatitude,
        longitude: emp.currentLongitude,
        slot1,
        slot2,
        slot3,
        nextSlotArea: nextOrder?.order.orderAreaName || nextOrder?.order.address || null,
        lastSlot,
        totalOrders: empOrders.length,
      };
    });
  }

  async getRoutingData(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const rows = await db.select({
      order: orders,
      employeeName: employees.name,
    }).from(orders)
      .leftJoin(employees, eq(orders.employeeId, employees.id))
      .where(and(gte(orders.appointmentTime, dayStart), lte(orders.appointmentTime, dayEnd)))
      .orderBy(orders.appointmentTime);

    return rows.map(r => ({
      ...r.order,
      employeeName: r.employeeName,
    }));
  }

  async updateOrderAcceptanceStatus(id: number, status: string) {
    const [updated] = await db.update(orders).set({ acceptanceStatus: status }).where(eq(orders.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
