import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export Auth models (REQUIRED for Replit Auth)
export * from "./models/auth";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

// Extend user profile for beauticians if needed, or just use this table to track extra info
// The prompt asks for a "beauticians" table. We'll link it to the auth users.
export const beauticians = pgTable("beauticians", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id), // Link to Replit Auth user
  isOnline: boolean("is_online").default(false),
  currentLatitude: doublePrecision("current_latitude"),
  currentLongitude: doublePrecision("current_longitude"),
  lastLocationUpdate: timestamp("last_location_update"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  services: jsonb("services").notNull().$type<{ name: string; price: number }[]>(), // JSON list of services
  amount: integer("amount").notNull(), // Storing in cents or smallest unit usually better, but MVP maybe flat
  duration: integer("duration").notNull(), // in minutes
  appointmentTime: timestamp("appointment_time").notNull(),
  paymentMode: text("payment_mode").notNull(), // 'cash', 'online', etc.
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'completed', 'cancelled'
  beauticianId: integer("beautician_id").references(() => beauticians.id), // Assigned beautician
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  beauticianId: integer("beautician_id").references(() => beauticians.id),
  issueType: text("issue_type").notNull(), // 'Cab Not Available', etc.
  notes: text("notes"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  beauticianId: integer("beautician_id").references(() => beauticians.id),
  action: text("action").notNull(), // 'start_shift', 'end_shift'
  timestamp: timestamp("timestamp").defaultNow(),
});

// For live tracking history if needed, or just updates
export const locationHistory = pgTable("location_history", {
  id: serial("id").primaryKey(),
  beauticianId: integer("beautician_id").references(() => beauticians.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===
export const beauticianRelations = relations(beauticians, ({ one, many }) => ({
  user: one(users, {
    fields: [beauticians.userId],
    references: [users.id],
  }),
  orders: many(orders),
  issues: many(issues),
  attendance: many(attendance),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  beautician: one(beauticians, {
    fields: [orders.beauticianId],
    references: [beauticians.id],
  }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  order: one(orders, {
    fields: [issues.orderId],
    references: [orders.id],
  }),
  beautician: one(beauticians, {
    fields: [issues.beauticianId],
    references: [beauticians.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertBeauticianSchema = createInsertSchema(beauticians).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, timestamp: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, timestamp: true });
export const insertLocationSchema = createInsertSchema(locationHistory).omit({ id: true, timestamp: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Beautician = typeof beauticians.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LocationUpdate = typeof locationHistory.$inferSelect;

export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Request types
export type CreateIssueRequest = InsertIssue;
export type StartShiftRequest = { beauticianId: number };
export type EndShiftRequest = { beauticianId: number };
export type UpdateLocationRequest = { latitude: number; longitude: number; beauticianId: number };
export type CreateOrderRequest = z.infer<typeof insertOrderSchema>; // For seeding/admin
