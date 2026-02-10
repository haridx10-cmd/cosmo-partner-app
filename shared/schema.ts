import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// === SESSION TABLE (kept for express-session) ===
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// === EMPLOYEES TABLE (replaces users + beauticians) ===
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").unique(),
  username: text("username").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("employee"), // 'employee' | 'admin'
  isOnline: boolean("is_online").default(false),
  currentLatitude: doublePrecision("current_latitude"),
  currentLongitude: doublePrecision("current_longitude"),
  lastActiveTime: timestamp("last_active_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ORDERS TABLE ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  mapsUrl: text("maps_url"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  services: jsonb("services").notNull().$type<{ name: string; price: number }[]>(),
  amount: integer("amount").notNull(),
  duration: integer("duration").notNull().default(60),
  appointmentTime: timestamp("appointment_time").notNull(),
  paymentMode: text("payment_mode").notNull().default("cash"),
  status: text("status").notNull().default("pending"),
  employeeId: integer("employee_id").references(() => employees.id),
  hasIssue: boolean("has_issue").default(false),
  sheetRowId: text("sheet_row_id"),
  beauticianHomeArea: text("beautician_home_area"),
  orderAreaName: text("order_area_name"),
  acceptanceStatus: text("acceptance_status").default("pending"),
}, (table) => [
  index("idx_orders_appointment_time").on(table.appointmentTime),
  index("idx_orders_employee").on(table.employeeId),
]);

// === ISSUES TABLE ===
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  employeeId: integer("employee_id").references(() => employees.id),
  issueType: text("issue_type").notNull(),
  notes: text("notes"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: text("status").notNull().default("open"), // 'open' | 'resolved'
  createdAt: timestamp("created_at").defaultNow(),
});

// === ATTENDANCE TABLE ===
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  shiftStart: timestamp("shift_start"),
  shiftEnd: timestamp("shift_end"),
  status: text("status").notNull().default("active"), // 'active' | 'ended'
});

// === LOCATION HISTORY ===
export const locationHistory = pgTable("location_history", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === BEAUTICIAN LIVE TRACKING ===
export const beauticianLiveTracking = pgTable("beautician_live_tracking", {
  id: serial("id").primaryKey(),
  beauticianId: integer("beautician_id").notNull().references(() => employees.id),
  orderId: integer("order_id").references(() => orders.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  speed: doublePrecision("speed"),
  status: text("status").notNull().default("idle"), // 'traveling' | 'at_location' | 'idle'
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_live_tracking_beautician").on(table.beauticianId),
  index("idx_live_tracking_order").on(table.orderId),
  index("idx_live_tracking_timestamp").on(table.timestamp),
]);

// === ORDER SERVICE SESSIONS ===
export const orderServiceSessions = pgTable("order_service_sessions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  beauticianId: integer("beautician_id").notNull().references(() => employees.id),
  serviceStartTime: timestamp("service_start_time").notNull().defaultNow(),
  expectedDurationMinutes: integer("expected_duration_minutes").notNull().default(60),
  serviceEndTime: timestamp("service_end_time"),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'cancelled'
}, (table) => [
  index("idx_service_session_order").on(table.orderId),
  index("idx_service_session_beautician").on(table.beauticianId),
]);

// === RELATIONS ===
export const employeeRelations = relations(employees, ({ many }) => ({
  orders: many(orders),
  issues: many(issues),
  attendance: many(attendance),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  employee: one(employees, { fields: [orders.employeeId], references: [employees.id] }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  order: one(orders, { fields: [issues.orderId], references: [orders.id] }),
  employee: one(employees, { fields: [issues.employeeId], references: [employees.id] }),
}));

// === INSERT SCHEMAS ===
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true });
export const insertLiveTrackingSchema = createInsertSchema(beauticianLiveTracking).omit({ id: true, timestamp: true });
export const insertServiceSessionSchema = createInsertSchema(orderServiceSessions).omit({ id: true });

// === TYPES ===
export type Employee = typeof employees.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LocationUpdate = typeof locationHistory.$inferSelect;
export type LiveTracking = typeof beauticianLiveTracking.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertLiveTracking = z.infer<typeof insertLiveTrackingSchema>;
export type ServiceSession = typeof orderServiceSessions.$inferSelect;
export type InsertServiceSession = z.infer<typeof insertServiceSessionSchema>;
