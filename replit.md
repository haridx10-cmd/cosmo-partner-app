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
- `location_history` - GPS coordinate log
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
- `client/src/pages/admin/AdminDashboard.tsx` - Admin panel with 5 tabs
- `client/src/components/LocationTracker.tsx` - GPS tracking component (10-sec intervals)

## Demo Credentials
- Admin: `admin@salon.com` / `admin123`
- Employee: `priya` / `1234` or `neha` / `1234`

## API Routes
- POST `/api/auth/login` - Login with identifier + password
- GET `/api/auth/me` - Current user
- POST `/api/auth/logout` - Logout
- POST `/api/auth/register` - Register new employee (admin)
- POST `/api/employee/shift` - Toggle shift on/off
- POST `/api/employee/location` - Update GPS location
- GET `/api/orders` - Employee's orders
- PATCH `/api/orders/:id/status` - Update order status
- POST `/api/issues` - Report issue
- GET `/api/admin/overview` - Dashboard stats
- GET `/api/admin/orders` - All orders
- GET `/api/admin/issues` - All issues
- PATCH `/api/admin/issues/:id/resolve` - Resolve issue
- GET `/api/admin/employees` - All employees
- GET `/api/admin/tracking` - Live tracking data
- POST `/api/admin/sync-sheets` - Manual Google Sheets sync

## Google Sheets Integration
Set env vars `GOOGLE_SHEET_ID` and either `GOOGLE_SHEETS_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON` for automatic 2-minute sync. Expected sheet columns: CustomerName, Phone, Address, Services, Amount, Date, Time, PaymentMode, EmployeeName.

## Recent Changes
- 2026-02-06: Complete rebuild with custom auth, admin dashboard, GPS tracking, Google Sheets sync
