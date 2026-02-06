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
});

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

// === TYPES ===
export type Employee = typeof employees.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LocationUpdate = typeof locationHistory.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
