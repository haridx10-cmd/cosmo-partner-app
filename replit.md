# Salon at Home - Employee Management System

## Overview
Production-grade salon-at-home employee management system with custom authentication, role-based access, admin dashboard, Google Sheets order sync, and real-time GPS tracking.

## Architecture
- **Backend**: Express.js with express-session, bcryptjs auth, PostgreSQL via Drizzle ORM
- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, shadcn/ui
- **Auth**: Custom username/password auth (employees via mobile/username, admins via email/password)
- **Map**: Leaflet/react-leaflet for GPS visualization

## Database Schema (PostgreSQL)
- `employees` - unified user table (employee + admin roles), auth fields, GPS coordinates
- `orders` - customer orders with services JSON, appointment times, sheet sync IDs
- `issues` - employee-reported issues linked to orders
- `attendance` - shift tracking
- `location_history` - GPS coordinate log (basic)
- `beautician_live_tracking` - detailed GPS tracking with accuracy, speed, status, order linkage
- `sessions` - express-session storage

## Key Files
- `shared/schema.ts` - Drizzle schema definitions
- `shared/routes.ts` - API route definitions with Zod validation
- `server/routes.ts` - Express route handlers with auth middleware
- `server/storage.ts` - Database CRUD operations interface
- `server/sheets-sync.ts` - Google Sheets sync service (2-min intervals)
- `client/src/hooks/use-auth.ts` - Frontend auth state management
- `client/src/hooks/use-beautician.ts` - Employee shift/location/issue hooks
- `client/src/hooks/use-orders.ts` - Order management hooks
- `client/src/pages/LoginPage.tsx` - Custom login (mobile/username/email + password)
- `client/src/pages/admin/AdminDashboard.tsx` - Admin panel with 7 tabs (Overview, Orders, Issues, Beauticians, Routing, Tracking, Team)
- `client/src/pages/admin/BeauticiansPanel.tsx` - Beautician resource planning with slot availability
- `client/src/pages/admin/RoutingPanel.tsx` - Order routing with time grouping and assignment
- `client/src/components/LocationTracker.tsx` - Smart GPS tracking (dynamic intervals: 15s traveling, 60s at location/idle)

## Demo Credentials
- Admin: `admin@salon.com` / `admin123`
- Employee: `priya` / `1234` or `neha` / `1234`

## API Routes
- POST `/api/auth/login` - Login with identifier + password
- GET `/api/auth/me` - Current user
- POST `/api/auth/logout` - Logout
- POST `/api/auth/register` - Register new employee (admin)
- POST `/api/employee/shift` - Toggle shift on/off
- POST `/api/employee/location` - Update GPS location (enhanced: accuracy, speed, orderId, trackingStatus)
- GET `/api/tracking/live/:beauticianId` - Latest tracking point for beautician
- GET `/api/tracking/beautician/:beauticianId` - Movement trail (last 24h)
- GET `/api/tracking/order/:orderId` - Tracking history for an order
- GET `/api/orders` - Employee's orders
- PATCH `/api/orders/:id/status` - Update order status
- POST `/api/issues` - Report issue
- GET `/api/admin/overview?startDate&endDate` - Dashboard stats (date-filtered)
- GET `/api/admin/orders?startDate&endDate` - All orders (date-filtered)
- GET `/api/admin/issues?startDate&endDate` - All issues (date-filtered)
- PATCH `/api/admin/issues/:id/resolve` - Resolve issue
- GET `/api/admin/employees` - All employees
- GET `/api/admin/beauticians?date` - Beautician resource planning data
- GET `/api/admin/routing?date` - Routing data for a date
- PATCH `/api/admin/orders/:id/acceptance` - Update order acceptance status
- GET `/api/admin/tracking` - Live tracking data
- POST `/api/admin/sync-sheets` - Manual Google Sheets sync

## Google Sheets Integration
Set env vars `GOOGLE_SHEET_ID` and either `GOOGLE_SHEETS_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON` for automatic 2-minute sync. Expected sheet columns: CustomerName, Phone, Address, Services, Amount, Date, Time, PaymentMode, EmployeeName, MapsURL (column J optional).

## Smart Navigation System
- Orders have `maps_url` field for Google Maps links
- Sheets sync auto-detects maps URLs in address text or column J
- Navigation priority: maps_url > lat/lng > address geocoding (Nominatim)
- OrderDetailsPage has "Call Customer" (tel: link) and "Navigate" (smart location) buttons
- Map preview uses resolved coordinates with geocoding fallback

## Live Tracking System
- `beautician_live_tracking` table stores GPS points with accuracy, speed, status, order linkage
- Smart dynamic intervals: 15s when traveling, 60s at customer/idle
- Speed-based status detection: >2 km/h = traveling, <2 km/h = at_location/idle
- Tracking auto-starts on shift start, auto-stops on shift end
- Order-aware tracking links GPS points to active orders
- GPS error banner shown if location unavailable
- Admin can view movement trail with polyline visualization
- 7-day data retention with automatic cleanup every 6 hours

## Service Timer System
- `order_service_sessions` table tracks service start/stop times, expected duration, order linkage
- Start/Stop Service button on OrderDetailsPage with live HH:MM:SS countdown
- Color-coded warning banners: red (overtime), orange (<=30min), yellow (<=60min remaining)
- Service start auto-sets tracking status to at_location and order status to in_progress
- Admin TrackingPanel shows service indicators: On Time (green), Near Delay (orange), Delayed (red) badges
- Admin selected employee details show "Service In Progress" panel with expected duration and start time
- Offline location caching: LocationTracker stores up to 50 pending GPS updates for retry

## Admin Operations Command Center
- Global date range filter at top of admin panel (Today/Yesterday/Last 7 days/custom date)
- Overview tab: Ongoing orders, open issues (click → Issues), delayed orders (click → Orders), completed value (count + sum), available beauticians (click → Beauticians), total employees, active now
- Beauticians tab: Resource planning table with slot availability (10-12, 12-3, 3-7), online/offline/on-job status, GPS location, next slot area, last slot indicator
- Routing tab: Date-filtered orders grouped by Morning/Afternoon/Evening, click-to-call, Google Maps deep links, beautician assignment with Actual Routing vs Route Simulator modes, acceptance status, order status with delay detection
- Team tab: Click-to-call on employee phone numbers
- Orders table extended: beauticianHomeArea, orderAreaName, acceptanceStatus fields

## Recent Changes
- 2026-02-10: Expanded admin panel into operations command center with global date filter, Beauticians tab, Routing tab, enhanced Overview tab, click-to-call
- 2026-02-06: Added Service Timer Management with real-time countdown, delay warnings, admin monitoring
- 2026-02-06: Implemented Live Beautician Location Tracking with smart intervals, trail visualization, 7-day retention
- 2026-02-06: Added Smart Location Navigation with maps_url, geocoding fallback, call customer, navigate buttons
- 2026-02-06: Complete rebuild with custom auth, admin dashboard, GPS tracking, Google Sheets sync
