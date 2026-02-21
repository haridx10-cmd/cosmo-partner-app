CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"shift_start" timestamp,
	"shift_end" timestamp,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beautician_live_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"beautician_id" integer NOT NULL,
	"order_id" integer,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" double precision,
	"speed" double precision,
	"status" text DEFAULT 'idle' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"username" text,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"is_online" boolean DEFAULT false,
	"current_latitude" double precision,
	"current_longitude" double precision,
	"last_active_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "employees_username_unique" UNIQUE("username"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"employee_id" integer,
	"issue_type" text NOT NULL,
	"notes" text,
	"latitude" double precision,
	"longitude" double precision,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "location_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_service_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"beautician_id" integer NOT NULL,
	"service_start_time" timestamp DEFAULT now() NOT NULL,
	"expected_duration_minutes" integer DEFAULT 60 NOT NULL,
	"service_end_time" timestamp,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"maps_url" text,
	"latitude" double precision,
	"longitude" double precision,
	"services" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"appointment_time" timestamp NOT NULL,
	"payment_mode" text DEFAULT 'cash' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"employee_id" integer,
	"has_issue" boolean DEFAULT false,
	"sheet_row_id" text,
	"sheet_date" text,
	"sheet_time" text,
	"order_num" integer,
	"beautician_home_area" text,
	"order_area_name" text,
	"acceptance_status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beautician_live_tracking" ADD CONSTRAINT "beautician_live_tracking_beautician_id_employees_id_fk" FOREIGN KEY ("beautician_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beautician_live_tracking" ADD CONSTRAINT "beautician_live_tracking_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_history" ADD CONSTRAINT "location_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_service_sessions" ADD CONSTRAINT "order_service_sessions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_service_sessions" ADD CONSTRAINT "order_service_sessions_beautician_id_employees_id_fk" FOREIGN KEY ("beautician_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_live_tracking_beautician" ON "beautician_live_tracking" USING btree ("beautician_id");--> statement-breakpoint
CREATE INDEX "idx_live_tracking_order" ON "beautician_live_tracking" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_live_tracking_timestamp" ON "beautician_live_tracking" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_service_session_order" ON "order_service_sessions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_service_session_beautician" ON "order_service_sessions" USING btree ("beautician_id");--> statement-breakpoint
CREATE INDEX "idx_orders_appointment_time" ON "orders" USING btree ("appointment_time");--> statement-breakpoint
CREATE INDEX "idx_orders_employee" ON "orders" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");