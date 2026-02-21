import { db } from "./db";
import {
  employees, orders, issues, attendance, locationHistory, beauticianLiveTracking, orderServiceSessions,
  products, productPurchases, productConsumptions, productRequests, serviceProductMapping,
  type Employee, type Order, type Issue, type Attendance, type LiveTracking, type ServiceSession,
  type InsertIssue, type InsertOrder, type InsertLiveTracking, type Product, type InsertProduct, type ProductRequest, type InsertProductRequest
} from "@shared/schema";
import { eq, and, desc, sql, or, gte, lte, lt } from "drizzle-orm";

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
  getBeauticiansData(date: Date): Promise<{ id: number; name: string; mobile: string | null; status: string; latitude: number | null; longitude: number | null; order1: string; order2: string; order3: string; nextSlotArea: string | null; lastSlot: boolean; totalOrders: number }[]>;
  getRoutingData(date: Date): Promise<any[]>;
  updateOrderAcceptanceStatus(id: number, status: string): Promise<Order>;
  updateOrderNum(id: number, orderNum: number | null): Promise<Order>;
  autoGenerateConsumptionsForOrder(orderId: number): Promise<void>;

  // Inventory
  upsertProductByName(input: { name: string; unit: string; costPerUnit: string | number; lowStockThreshold?: string | number }): Promise<Product>;
  getActiveProducts(): Promise<Product[]>;
  createProductRequest(data: InsertProductRequest): Promise<ProductRequest>;
  getProductRequestsForBeautician(beauticianId: number): Promise<Array<ProductRequest & { productName: string }>>;
  getStockSummary(): Promise<Array<{ productId: number; productName: string; unit: string; lowStockThreshold: number; totalPurchased: number; totalUsed: number; stockLeft: number; costPerUnit: number }>>;
  getWalletMonthlySummary(beauticianId: number, now?: Date): Promise<{ completedOrders: number; totalRevenue: number; totalCommission: number; serviceBreakdown: Array<{ serviceName: string; count: number }> }>;
  getInventoryAdminSummary(): Promise<{
    stock: Array<{ productId: number; productName: string; unit: string; lowStockThreshold: number; totalPurchased: number; totalUsed: number; stockLeft: number; costPerUnit: number }>;
    totalPurchaseValue: number;
    totalConsumptionValue: number;
    usageByBeautician: Array<{ beauticianId: number; beauticianName: string; totalUsageValue: number; totalUsageQty: number }>;
  }>;
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

  async getActiveProducts() {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async createProductRequest(data: InsertProductRequest) {
    const [created] = await db.insert(productRequests).values(data).returning();
    return created;
  }

  async getProductRequestsForBeautician(beauticianId: number) {
    const rows = await db.select({
      request: productRequests,
      productName: products.name,
    }).from(productRequests)
      .innerJoin(products, eq(productRequests.productId, products.id))
      .where(eq(productRequests.beauticianId, beauticianId))
      .orderBy(desc(productRequests.requestedAt));
    return rows.map((r) => ({ ...r.request, productName: r.productName }));
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

  async autoGenerateConsumptionsForOrder(orderId: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || !order.employeeId) return;

    const [existingConsumption] = await db.select({ id: productConsumptions.id })
      .from(productConsumptions)
      .where(order.externalOrderId
        ? or(
            eq(productConsumptions.orderId, orderId),
            eq(productConsumptions.externalOrderId, order.externalOrderId),
          )
        : eq(productConsumptions.orderId, orderId))
      .limit(1);
    if (existingConsumption) return;

    const serviceNames = (order.services || [])
      .map((s: any) => String(s?.name || "").trim().toLowerCase())
      .filter(Boolean);
    if (!serviceNames.length) return;

    const allMappings = await db.select().from(serviceProductMapping);
    const mappings = allMappings.filter((m) => serviceNames.includes(m.serviceName.trim().toLowerCase()));
    if (!mappings.length) return;

    await db.insert(productConsumptions).values(
      mappings.map((m) => ({
        orderId,
        externalOrderId: order.externalOrderId ?? null,
        beauticianId: order.employeeId!,
        productId: m.productId,
        quantityUsed: m.quantityRequired,
        autoGenerated: true,
      }))
    );
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
