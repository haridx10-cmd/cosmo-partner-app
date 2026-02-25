import { db } from "./db";
import {
  employees, orders, issues, attendance, locationHistory, beauticianLiveTracking, orderServiceSessions,
  products, productPurchases, productConsumptions, productRequests, serviceProductMapping, orderDefaultProducts,
  productsNotFound,
  type Employee, type Order, type Issue, type Attendance, type LiveTracking, type ServiceSession,
  type InsertIssue, type InsertOrder, type InsertLiveTracking, type Product, type InsertProduct, type ProductRequest, type InsertProductRequest,
  type InsertProductPurchase, type InsertServiceProductMap, type InsertOrderDefaultProduct, type ProductsNotFound, type InsertProductsNotFound
} from "@shared/schema";
import { eq, and, desc, sql, or, gte, lte, lt, inArray } from "drizzle-orm";

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
  cancelOrder(id: number, reason: string): Promise<Order>;
  expireInactiveOrders(before: Date): Promise<number>;
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
  getBeauticiansData(date: Date): Promise<{ id: number; name: string; mobile: string | null; status: string; latitude: number | null; longitude: number | null; order1: string; order2: string; order3: string; nextSlotArea: string | null; lastSlot: boolean; totalOrders: number }[]>;
  getRoutingData(date: Date): Promise<any[]>;
  updateOrderAcceptanceStatus(id: number, status: string): Promise<Order>;
  updateOrderNum(id: number, orderNum: number | null): Promise<Order>;
  autoGenerateConsumptionsForOrder(orderId: number): Promise<void>;

  // Inventory
  upsertProductByName(input: { name: string; unit: string; costPerUnit: string | number; lowStockThreshold?: string | number }): Promise<Product>;
  getProductByName(name: string): Promise<Product | undefined>;
  getActiveProducts(): Promise<Product[]>;
  createProductRequest(data: InsertProductRequest): Promise<ProductRequest>;
  getProductRequestsForBeautician(beauticianId: number): Promise<Array<ProductRequest & { productName: string }>>;
  getProductRequestsForAdmin(status?: string): Promise<Array<ProductRequest & { productName: string; beauticianName: string }>>;
  approveProductRequest(requestId: number, approvedBy: number, quantityApproved: number): Promise<ProductRequest | undefined>;
  getCancelledOrdersByCategory(category: "customer" | "beautician"): Promise<Array<{ order: Order; employeeName: string | null }>>;
  reallocateCancelledOrder(orderId: number): Promise<Order | undefined>;
  getStockSummary(): Promise<Array<{ productId: number; productName: string; unit: string; lowStockThreshold: number; totalPurchased: number; totalUsed: number; stockLeft: number; costPerUnit: number }>>;
  getWalletMonthlySummary(beauticianId: number, now?: Date): Promise<{ completedOrders: number; totalRevenue: number; totalCommission: number; serviceBreakdown: Array<{ serviceName: string; count: number }> }>;
  getInventoryAdminSummary(): Promise<{
    stock: Array<{ productId: number; productName: string; unit: string; lowStockThreshold: number; totalPurchased: number; totalUsed: number; stockLeft: number; costPerUnit: number }>;
    totalPurchaseValue: number;
    totalConsumptionValue: number;
    usageByBeautician: Array<{ beauticianId: number; beauticianName: string; totalUsageValue: number; totalUsageQty: number }>;
  }>;
  getProductStock(productId: number): Promise<number>;
  createProductPurchase(input: InsertProductPurchase): Promise<void>;
  upsertServiceProductMapping(input: InsertServiceProductMap): Promise<void>;
  upsertOrderDefaultProduct(input: InsertOrderDefaultProduct): Promise<void>;
  logMissingProduct(data: { orderId: number; externalOrderId?: string | null; serviceName: string; productName?: string | null }): Promise<void>;
  getProductsNotFound(limit?: number): Promise<ProductsNotFound[]>;
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
    const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    const [order] = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    if (order && status === "completed" && existing?.status !== "completed") {
      await this.autoGenerateConsumptionsForOrder(order.id);
    }
    return order;
  }

  async cancelOrder(id: number, _reason: string): Promise<Order> {
    const reasonMap: Record<string, string> = {
      "Customer Cancelled (Emergency)": "customer_cancelled_emergency",
      "Customer Cancelled (Delay)": "customer_canceled_delay",
      "Unable to Reach Customer": "customer_not_available",
      "Cannot Accept (Unwell)": "unwell",
      "Cannot Accept (Timing Conflict)": "timing_conflict",
      "Cannot Accept (Location Issue)": "location_issue",
      "Order expired due to inactivity": "no_action_expired",
    };
    const mappedReason = reasonMap[_reason] || _reason || "supply_side";
    const [order] = await db.update(orders)
      .set({ status: "cancelled", acceptanceStatus: mappedReason })
      .where(eq(orders.id, id))
      .returning();
    try {
      await db.execute(sql`UPDATE orders SET cancellation_reason = ${mappedReason} WHERE id = ${id}`);
    } catch {
      // cancellation_reason column is optional until migration is applied
    }
    return order;
  }

  async expireInactiveOrders(before: Date): Promise<number> {
    const stale = await db.select({ id: orders.id }).from(orders)
      .leftJoin(orderServiceSessions, eq(orderServiceSessions.orderId, orders.id))
      .where(and(
        inArray(orders.status, ["pending", "confirmed"]),
        lt(orders.appointmentTime, before),
        sql`${orderServiceSessions.id} IS NULL`,
      ));

    if (!stale.length) return 0;
    const ids = stale.map((s) => s.id);
    const updated = await db.update(orders)
      .set({
        status: "expired",
        acceptanceStatus: "no_action_expired",
      })
      .where(inArray(orders.id, ids))
      .returning({ id: orders.id });
    if (updated.length > 0) {
      try {
        await db.execute(sql`UPDATE orders SET cancellation_reason = 'no_action_expired' WHERE id = ANY(${ids})`);
      } catch {
        // cancellation_reason column is optional until migration is applied
      }
    }
    return updated.length;
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

      const order1 = empOrders.some(o => o.order.orderNum === 1) ? 'Y' : 'N';
      const order2 = empOrders.some(o => o.order.orderNum === 2) ? 'Y' : 'N';
      const order3 = empOrders.some(o => o.order.orderNum === 3) ? 'Y' : 'N';

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
        order1,
        order2,
        order3,
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

  async updateOrderNum(id: number, orderNum: number | null) {
    const [updated] = await db.update(orders).set({ orderNum }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async upsertProductByName(input: { name: string; unit: string; costPerUnit: string | number; lowStockThreshold?: string | number }) {
    const normalizedName = input.name.trim();
    const [existing] = await db.select().from(products).where(sql`LOWER(${products.name}) = LOWER(${normalizedName})`).limit(1);
    if (existing) {
      const [updated] = await db.update(products).set({
        unit: input.unit.trim(),
        costPerUnit: String(input.costPerUnit),
        lowStockThreshold: String(input.lowStockThreshold ?? 0),
        isActive: true,
      }).where(eq(products.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(products).values({
      name: normalizedName,
      unit: input.unit.trim(),
      costPerUnit: String(input.costPerUnit),
      lowStockThreshold: String(input.lowStockThreshold ?? 0),
      isActive: true,
    } as InsertProduct).returning();
    return created;
  }

  async getProductByName(name: string) {
    const normalizedName = name.trim();
    const [row] = await db.select().from(products).where(sql`LOWER(${products.name}) = LOWER(${normalizedName})`).limit(1);
    return row;
  }

  async getActiveProducts() {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async createProductPurchase(input: InsertProductPurchase) {
    if (input.invoiceNumber) {
      const [duplicateInvoice] = await db.select({ id: productPurchases.id }).from(productPurchases).where(and(
        eq(productPurchases.productId, input.productId),
        eq(productPurchases.invoiceNumber, input.invoiceNumber),
      )).limit(1);
      if (duplicateInvoice) return;
    }
    const [existing] = await db.select({ id: productPurchases.id }).from(productPurchases).where(and(
      eq(productPurchases.productId, input.productId),
      eq(productPurchases.quantity, input.quantity),
      eq(productPurchases.purchaseDate, input.purchaseDate),
      sql`COALESCE(${productPurchases.vendorName}, '') = ${input.vendorName ?? ""}`,
      sql`COALESCE(${productPurchases.invoiceNumber}, '') = ${input.invoiceNumber ?? ""}`,
      sql`COALESCE(${productPurchases.createdBy}, 0) = ${input.createdBy ?? 0}`,
    )).limit(1);
    if (existing) return;
    await db.insert(productPurchases).values(input);
  }

  async getProductRequestsForAdmin(status?: string) {
    try {
      const rows = await db.select({
        request: productRequests,
        productName: products.name,
        beauticianName: employees.name,
      }).from(productRequests)
        .innerJoin(products, eq(productRequests.productId, products.id))
        .innerJoin(employees, eq(productRequests.beauticianId, employees.id))
        .where(status ? eq(productRequests.status, status) : undefined)
        .orderBy(desc(productRequests.createdAt), desc(productRequests.requestedAt));
      return rows.map((r) => ({
        ...r.request,
        productName: r.productName,
        beauticianName: r.beauticianName,
      }));
    } catch {
      const rows = await db.execute(sql`
        SELECT
          pr.id,
          pr.beautician_id as "beauticianId",
          pr.product_id as "productId",
          pr.quantity_requested as "quantityRequested",
          pr.status,
          pr.requested_at as "requestedAt",
          p.name as "productName",
          e.name as "beauticianName"
        FROM product_requests pr
        INNER JOIN products p ON p.id = pr.product_id
        INNER JOIN employees e ON e.id = pr.beautician_id
        ${status ? sql`WHERE pr.status = ${status}` : sql``}
        ORDER BY pr.requested_at DESC
      `);
      return rows.rows as Array<ProductRequest & { productName: string; beauticianName: string }>;
    }
  }

  async approveProductRequest(requestId: number, approvedBy: number, quantityApproved: number) {
    let request: ProductRequest | undefined;
    try {
      [request] = await db.select().from(productRequests).where(eq(productRequests.id, requestId)).limit(1);
    } catch {
      const rows = await db.execute(sql`
        SELECT
          id,
          beautician_id as "beauticianId",
          product_id as "productId",
          quantity_requested as "quantityRequested",
          status,
          requested_at as "requestedAt"
        FROM product_requests
        WHERE id = ${requestId}
        LIMIT 1
      `);
      request = rows.rows[0] as ProductRequest | undefined;
    }
    if (!request) return undefined;

    const requested = Number(request.quantityRequested);
    let status: "approved" | "partially_approved" | "rejected" = "rejected";
    if (quantityApproved >= requested) status = "approved";
    else if (quantityApproved > 0) status = "partially_approved";

    let updated: ProductRequest | undefined;
    try {
      [updated] = await db.update(productRequests)
        .set({
          status,
          quantityApproved: String(Math.max(quantityApproved, 0)),
          approvedAt: new Date(),
          approvedBy,
        })
        .where(eq(productRequests.id, requestId))
        .returning();
    } catch {
      const rows = await db.execute(sql`
        UPDATE product_requests
        SET status = ${status}
        WHERE id = ${requestId}
        RETURNING
          id,
          beautician_id as "beauticianId",
          product_id as "productId",
          quantity_requested as "quantityRequested",
          status,
          requested_at as "requestedAt"
      `);
      updated = rows.rows[0] as ProductRequest | undefined;
    }

    if (!updated) return undefined;

    if (quantityApproved > 0) {
      await this.createProductPurchase({
        productId: updated.productId,
        quantity: String(quantityApproved),
        purchaseDate: new Date().toISOString().slice(0, 10),
        vendorName: "Internal Transfer",
        invoiceNumber: `AUTO-${updated.id}`,
        createdBy: approvedBy,
      });
    }
    return updated;
  }

  async getCancelledOrdersByCategory(category: "customer" | "beautician") {
    const customerReasons = new Set([
      "customer_cancelled_emergency",
      "customer_not_available",
      "customer_canceled_delay",
      "demand_side",
      "customer cancelled (emergency)",
      "customer cancelled (delay)",
      "unable to reach customer",
    ]);
    const beauticianReasons = new Set([
      "unwell",
      "timing_conflict",
      "location_issue",
      "no_action_expired",
      "supply_side",
      "cannot accept (unwell)",
      "cannot accept (timing conflict)",
      "cannot accept (location issue)",
    ]);

    let rows;
    try {
      rows = await db.execute(sql`
        SELECT o.*, e.name as "employeeName"
        FROM orders o
        LEFT JOIN employees e ON e.id = o.employee_id
        WHERE o.status = 'cancelled'
        ORDER BY o.appointment_time DESC
      `);
    } catch {
      rows = await db.execute(sql`
        SELECT o.*, e.name as "employeeName"
        FROM orders o
        LEFT JOIN employees e ON e.id = o.employee_id
        WHERE o.status = 'cancelled'
        ORDER BY o.appointment_time DESC
      `);
    }

    const mapped = rows.rows.map((r: any) => {
      const normalizedReason = String(
        r.cancellation_reason ?? r.acceptance_status ?? r.acceptanceStatus ?? ""
      ).trim().toLowerCase();
      const order: any = {
        id: r.id,
        customerName: r.customer_name ?? r.customerName,
        phone: r.phone,
        address: r.address,
        mapsUrl: r.maps_url ?? r.mapsUrl ?? null,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        services: r.services,
        amount: r.amount,
        duration: r.duration,
        appointmentTime: r.appointment_time ?? r.appointmentTime,
        paymentMode: r.payment_mode ?? r.paymentMode,
        status: r.status,
        employeeId: r.employee_id ?? r.employeeId ?? null,
        hasIssue: r.has_issue ?? r.hasIssue ?? false,
        sheetRowId: r.sheet_row_id ?? r.sheetRowId ?? null,
        sheetDate: r.sheet_date ?? r.sheetDate ?? null,
        sheetTime: r.sheet_time ?? r.sheetTime ?? null,
        orderNum: r.order_num ?? r.orderNum ?? null,
        externalOrderId: r.external_order_id ?? r.externalOrderId ?? null,
        areaName: r.area_name ?? r.areaName ?? null,
        beauticianHomeArea: r.beautician_home_area ?? r.beauticianHomeArea ?? null,
        orderAreaName: r.order_area_name ?? r.orderAreaName ?? null,
        acceptanceStatus: r.acceptance_status ?? r.acceptanceStatus ?? null,
      };
      return {
        order: order as Order,
        employeeName: r.employeeName ? String(r.employeeName) : null,
        normalizedReason,
      };
    });

    return mapped
      .filter((row) => {
        if (category === "customer") return customerReasons.has(row.normalizedReason);
        return beauticianReasons.has(row.normalizedReason);
      })
      .map(({ normalizedReason, ...row }) => row);
  }

  async reallocateCancelledOrder(orderId: number) {
    const [original] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!original) return undefined;

    const [created] = await db.insert(orders).values({
      customerName: original.customerName,
      phone: original.phone,
      address: original.address,
      mapsUrl: original.mapsUrl,
      latitude: original.latitude,
      longitude: original.longitude,
      services: original.services,
      amount: original.amount,
      duration: original.duration,
      appointmentTime: original.appointmentTime,
      paymentMode: original.paymentMode,
      status: "pending",
      employeeId: null,
      hasIssue: false,
      sheetRowId: original.sheetRowId ? `${original.sheetRowId}_realloc_${Date.now()}` : null,
      sheetDate: original.sheetDate,
      sheetTime: original.sheetTime,
      orderNum: null,
      externalOrderId: `${original.externalOrderId || original.id}-realloc-${Date.now()}`,
      areaName: original.areaName,
      beauticianHomeArea: original.beauticianHomeArea,
      orderAreaName: original.orderAreaName,
      acceptanceStatus: "pending",
    }).returning();

    try {
      await db.execute(sql`UPDATE orders SET reference_order_id = ${original.id} WHERE id = ${created.id}`);
    } catch {
      // reference_order_id is optional until migration is applied
    }
    return created;
  }

  async upsertServiceProductMapping(input: InsertServiceProductMap) {
    await db.insert(serviceProductMapping).values(input).onConflictDoUpdate({
      target: [serviceProductMapping.serviceName, serviceProductMapping.productId],
      set: {
        quantityRequired: input.quantityRequired,
      },
    });
  }

  async upsertOrderDefaultProduct(input: InsertOrderDefaultProduct) {
    await db.insert(orderDefaultProducts).values(input).onConflictDoUpdate({
      target: [orderDefaultProducts.productId],
      set: {
        quantity: input.quantity,
      },
    });
  }

  async createProductRequest(data: InsertProductRequest) {
    try {
      const [created] = await db.insert(productRequests).values(data).returning();
      return created;
    } catch {
      const result = await db.execute(sql`
        INSERT INTO product_requests (beautician_id, product_id, quantity_requested, status, requested_at)
        VALUES (${data.beauticianId}, ${data.productId}, ${data.quantityRequested}, ${data.status ?? "pending"}, now())
        RETURNING *
      `);
      return result.rows[0] as ProductRequest;
    }
  }

  async getProductRequestsForBeautician(beauticianId: number) {
    try {
      const rows = await db.select({
        request: productRequests,
        productName: products.name,
      }).from(productRequests)
        .innerJoin(products, eq(productRequests.productId, products.id))
        .where(eq(productRequests.beauticianId, beauticianId))
        .orderBy(desc(productRequests.createdAt), desc(productRequests.requestedAt));
      return rows.map((r) => ({ ...r.request, productName: r.productName }));
    } catch {
      const rows = await db.execute(sql`
        SELECT
          pr.id,
          pr.beautician_id as "beauticianId",
          pr.product_id as "productId",
          pr.quantity_requested as "quantityRequested",
          pr.status,
          pr.requested_at as "requestedAt",
          p.name as "productName"
        FROM product_requests pr
        INNER JOIN products p ON p.id = pr.product_id
        WHERE pr.beautician_id = ${beauticianId}
        ORDER BY pr.requested_at DESC
      `);
      return rows.rows as Array<ProductRequest & { productName: string }>;
    }
  }

  async logMissingProduct(data: { orderId: number; externalOrderId?: string | null; serviceName: string; productName?: string | null; }) {
    await db.insert(productsNotFound).values({
      orderId: data.orderId,
      externalOrderId: data.externalOrderId ?? null,
      serviceName: data.serviceName,
      productName: data.productName ?? null,
    } as InsertProductsNotFound);
  }

  async getProductsNotFound(limit = 100) {
    return await db.select().from(productsNotFound).orderBy(desc(productsNotFound.createdAt)).limit(limit);
  }

  async getStockSummary() {
    const rows = await db.execute(sql`
      SELECT
        p.id AS "productId",
        p.name AS "productName",
        p.unit AS "unit",
        p.cost_per_unit AS "costPerUnit",
        p.low_stock_threshold AS "lowStockThreshold",
        COALESCE(pp.total_purchased, 0) AS "totalPurchased",
        COALESCE(pc.total_used, 0) AS "totalUsed",
        COALESCE(pp.total_purchased, 0) - COALESCE(pc.total_used, 0) AS "stockLeft"
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) AS total_purchased
        FROM product_purchases
        GROUP BY product_id
      ) pp ON pp.product_id = p.id
      LEFT JOIN (
        SELECT product_id, SUM(quantity_used) AS total_used
        FROM product_consumptions
        GROUP BY product_id
      ) pc ON pc.product_id = p.id
      WHERE p.is_active = true
      ORDER BY p.name ASC
    `);

    return rows.rows.map((r: any) => ({
      productId: Number(r.productId),
      productName: String(r.productName),
      unit: String(r.unit),
      lowStockThreshold: Number(r.lowStockThreshold ?? 0),
      totalPurchased: Number(r.totalPurchased ?? 0),
      totalUsed: Number(r.totalUsed ?? 0),
      stockLeft: Number(r.stockLeft ?? 0),
      costPerUnit: Number(r.costPerUnit ?? 0),
    }));
  }

  async getProductStock(productId: number) {
    const result = await db.execute(sql`
      SELECT
        COALESCE(pp.total_purchased, 0) - COALESCE(pc.total_used, 0) AS stock
      FROM (SELECT ${productId}::int AS product_id) pid
      LEFT JOIN (
        SELECT product_id, SUM(quantity) AS total_purchased
        FROM product_purchases
        WHERE product_id = ${productId}
        GROUP BY product_id
      ) pp ON pp.product_id = pid.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity_used) AS total_used
        FROM product_consumptions
        WHERE product_id = ${productId}
        GROUP BY product_id
      ) pc ON pc.product_id = pid.product_id
    `);
    const row = (result.rows[0] as any) || {};
    return Number(row.stock ?? 0);
  }

  async autoGenerateConsumptionsForOrder(orderId: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || !order.employeeId) return;

    const normalizedServices = (order.services || [])
      .map((s: any) => {
        if (typeof s === "string") return s.trim().toLowerCase();
        return String(s?.name || "").trim().toLowerCase();
      })
      .filter(Boolean);
    const serviceCounts = new Map<string, number>();
    for (const serviceName of normalizedServices) {
      serviceCounts.set(serviceName, (serviceCounts.get(serviceName) || 0) + 1);
    }

    const allMappings = await db.select().from(serviceProductMapping);
    const defaultProducts = await db.select().from(orderDefaultProducts);

    const mappingByService = new Map<string, typeof serviceProductMapping.$inferSelect[]>();
    const productIdSet = new Set<number>();
    for (const mapping of allMappings) {
      const key = mapping.serviceName.trim().toLowerCase();
      if (!mappingByService.has(key)) {
        mappingByService.set(key, []);
      }
      mappingByService.get(key)!.push(mapping);
      productIdSet.add(mapping.productId);
    }
    for (const defaultProduct of defaultProducts) {
      productIdSet.add(defaultProduct.productId);
    }

    let productRows: typeof products.$inferSelect[] = [];
    if (productIdSet.size > 0) {
      productRows = await db.select().from(products).where(inArray(products.id, Array.from(productIdSet)));
    }
    const productIndex = new Map<number, typeof products.$inferSelect>();
    for (const product of productRows) {
      productIndex.set(product.id, product);
    }

    const productQuantityMap = new Map<number, number>();
    for (const [serviceName, count] of Array.from(serviceCounts.entries())) {
      try {
        const mappings = mappingByService.get(serviceName);
        if (!mappings?.length) {
          await this.logMissingProduct({
            orderId,
            externalOrderId: order.externalOrderId ?? null,
            serviceName,
          });
          console.warn(`[Inventory Warning] No mapping found for service "${serviceName}"`);
          continue;
        }
        for (const mapping of mappings) {
          if (!productIndex.has(mapping.productId)) {
            await this.logMissingProduct({
              orderId,
              externalOrderId: order.externalOrderId ?? null,
              serviceName,
              productName: null,
            });
            console.warn(`[Inventory Warning] Product not found for service "${serviceName}" in Order #${orderId}`);
            continue;
          }
          const current = productQuantityMap.get(mapping.productId) || 0;
          productQuantityMap.set(mapping.productId, current + Number(mapping.quantityRequired) * count);
        }
      } catch (err: any) {
        console.warn(`[Inventory Warning] Failed to process service "${serviceName}" for Order #${orderId}: ${err.message || err}`);
      }
    }

    for (const defaultProduct of defaultProducts) {
      try {
        if (!productIndex.has(defaultProduct.productId)) {
          await this.logMissingProduct({
            orderId,
            externalOrderId: order.externalOrderId ?? null,
            serviceName: "default",
            productName: null,
          });
          console.warn(`[Inventory Warning] Default product missing for Order #${orderId}`);
          continue;
        }
        const current = productQuantityMap.get(defaultProduct.productId) || 0;
        productQuantityMap.set(defaultProduct.productId, current + Number(defaultProduct.quantity));
      } catch (err: any) {
        console.warn(`[Inventory Warning] Failed to add default product for Order #${orderId}: ${err.message || err}`);
      }
    }

    const insertRows = Array.from(productQuantityMap.entries())
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        orderId,
        beauticianId: order.employeeId!,
        productId,
        quantityUsed: String(qty),
        autoGenerated: true,
      }));

    if (!insertRows.length) return;

    const inserted = await db.insert(productConsumptions)
      .values(insertRows)
      .onConflictDoNothing({
        target: [productConsumptions.orderId, productConsumptions.productId],
      })
      .returning({ id: productConsumptions.id });

    console.log(`[Inventory] Deducted ${inserted.length} products for Order #${orderId}`);
  }

  async getWalletMonthlySummary(beauticianId: number, now = new Date()) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const completedOrders = await db.select().from(orders).where(and(
      eq(orders.employeeId, beauticianId),
      eq(orders.status, "completed"),
      gte(orders.appointmentTime, monthStart),
      lt(orders.appointmentTime, monthEnd),
    ));

    const serviceBreakdownMap = new Map<string, number>();
    let totalRevenue = 0;
    for (const o of completedOrders) {
      totalRevenue += o.amount ?? 0;
      const orderServices = (o.services || []) as Array<{ name: string }>;
      for (const s of orderServices) {
        const key = s.name?.trim();
        if (!key) continue;
        serviceBreakdownMap.set(key, (serviceBreakdownMap.get(key) || 0) + 1);
      }
    }

    return {
      completedOrders: completedOrders.length,
      totalRevenue,
      totalCommission: 0,
      serviceBreakdown: Array.from(serviceBreakdownMap.entries())
        .map(([serviceName, count]) => ({ serviceName, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getInventoryAdminSummary() {
    const stock = await this.getStockSummary();
    const totalPurchaseValue = stock.reduce((sum, s) => sum + (s.totalPurchased * s.costPerUnit), 0);
    const totalConsumptionValue = stock.reduce((sum, s) => sum + (s.totalUsed * s.costPerUnit), 0);

    const usageRows = await db.execute(sql`
      SELECT
        e.id AS "beauticianId",
        e.name AS "beauticianName",
        COALESCE(SUM(pc.quantity_used), 0) AS "totalUsageQty",
        COALESCE(SUM(pc.quantity_used * p.cost_per_unit), 0) AS "totalUsageValue"
      FROM employees e
      LEFT JOIN product_consumptions pc ON pc.beautician_id = e.id
      LEFT JOIN products p ON p.id = pc.product_id
      WHERE e.role = 'employee'
      GROUP BY e.id, e.name
      ORDER BY e.name ASC
    `);

    const usageByBeautician = usageRows.rows.map((r: any) => ({
      beauticianId: Number(r.beauticianId),
      beauticianName: String(r.beauticianName),
      totalUsageValue: Number(r.totalUsageValue ?? 0),
      totalUsageQty: Number(r.totalUsageQty ?? 0),
    }));

    return {
      stock,
      totalPurchaseValue,
      totalConsumptionValue,
      usageByBeautician,
    };
  }
}

export const storage = new DatabaseStorage();
