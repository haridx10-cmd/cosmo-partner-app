import { z } from 'zod';
import { insertIssueSchema, employees, orders, issues, beauticianLiveTracking, orderServiceSessions } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        identifier: z.string().min(1), // mobile, username, or email
        password: z.string().min(1),
      }),
      responses: {
        200: z.object({
          employee: z.custom<typeof employees.$inferSelect>(),
        }),
        401: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: z.object({
        name: z.string().min(1),
        mobile: z.string().optional(),
        username: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(4),
        role: z.enum(['employee', 'admin']).default('employee'),
      }),
      responses: {
        201: z.object({ employee: z.custom<typeof employees.$inferSelect>() }),
        400: errorSchemas.validation,
      },
    },
  },
  employee: {
    toggleShift: {
      method: 'POST' as const,
      path: '/api/employee/shift',
      input: z.object({ action: z.enum(['start_shift', 'end_shift']) }),
      responses: {
        200: z.object({ success: z.boolean(), state: z.enum(['online', 'offline']) }),
      },
    },
    updateLocation: {
      method: 'POST' as const,
      path: '/api/employee/location',
      input: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
        speed: z.number().nullable().optional(),
        orderId: z.number().nullable().optional(),
        trackingStatus: z.enum(['traveling', 'at_location', 'idle']).optional(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  inventory: {
    products: {
      method: "GET" as const,
      path: "/api/inventory/products",
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          unit: z.string(),
          costPerUnit: z.any(),
          lowStockThreshold: z.any(),
        })),
      },
    },
    createRequest: {
      method: "POST" as const,
      path: "/api/inventory/requests",
      input: z.object({
        productId: z.number(),
        quantityRequested: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.object({ id: z.number() }),
      },
    },
    myRequests: {
      method: "GET" as const,
      path: "/api/inventory/requests/me",
      responses: {
        200: z.array(z.object({
          id: z.number(),
          productName: z.string(),
          quantityRequested: z.any(),
          status: z.string(),
          requestedAt: z.string().nullable(),
        })),
      },
    },
    stockSummary: {
      method: "GET" as const,
      path: "/api/inventory/stock-summary",
      responses: {
        200: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          unit: z.string(),
          lowStockThreshold: z.number(),
          totalPurchased: z.number(),
          totalUsed: z.number(),
          stockLeft: z.number(),
          costPerUnit: z.number(),
        })),
      },
    },
  },
  wallet: {
    monthly: {
      method: "GET" as const,
      path: "/api/wallet/monthly",
      responses: {
        200: z.object({
          completedOrders: z.number(),
          totalRevenue: z.number(),
          totalCommission: z.number(),
          serviceBreakdown: z.array(z.object({
            serviceName: z.string(),
            count: z.number(),
          })),
        }),
      },
    },
  },
  tracking: {
    liveByBeautician: {
      method: 'GET' as const,
      path: '/api/tracking/live/:beauticianId',
      responses: {
        200: z.custom<typeof beauticianLiveTracking.$inferSelect>().nullable(),
      },
    },
    historyByBeautician: {
      method: 'GET' as const,
      path: '/api/tracking/beautician/:beauticianId',
      responses: {
        200: z.array(z.custom<typeof beauticianLiveTracking.$inferSelect>()),
      },
    },
    byOrder: {
      method: 'GET' as const,
      path: '/api/tracking/order/:orderId',
      responses: {
        200: z.array(z.custom<typeof beauticianLiveTracking.$inferSelect>()),
      },
    },
  },
  service: {
    start: {
      method: 'POST' as const,
      path: '/api/service/start',
      input: z.object({
        orderId: z.number(),
      }),
      responses: {
        200: z.custom<typeof orderServiceSessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    stop: {
      method: 'POST' as const,
      path: '/api/service/stop',
      input: z.object({
        sessionId: z.number(),
      }),
      responses: {
        200: z.custom<typeof orderServiceSessions.$inferSelect>(),
      },
    },
    activeForOrder: {
      method: 'GET' as const,
      path: '/api/service/order/:orderId',
      responses: {
        200: z.custom<typeof orderServiceSessions.$inferSelect>().nullable(),
      },
    },
    activeForBeautician: {
      method: 'GET' as const,
      path: '/api/service/beautician',
      responses: {
        200: z.custom<typeof orderServiceSessions.$inferSelect>().nullable(),
      },
    },
    allActive: {
      method: 'GET' as const,
      path: '/api/admin/service-sessions',
      responses: {
        200: z.array(z.custom<typeof orderServiceSessions.$inferSelect>()),
      },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      input: z.object({
        status: z.string().optional(),
        date: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id',
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status',
      input: z.object({ status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']) }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
      },
    },
  },
  issues: {
    create: {
      method: 'POST' as const,
      path: '/api/issues',
      input: insertIssueSchema.omit({ employeeId: true, status: true }),
      responses: {
        201: z.custom<typeof issues.$inferSelect>(),
      },
    },
  },
  admin: {
    overview: {
      method: 'GET' as const,
      path: '/api/admin/overview',
      responses: {
        200: z.object({
          totalEmployees: z.number(),
          activeEmployees: z.number(),
          totalOrders: z.number(),
          openIssues: z.number(),
          completedToday: z.number(),
        }),
      },
    },
    allOrders: {
      method: 'GET' as const,
      path: '/api/admin/orders',
      responses: {
        200: z.array(z.object({
          order: z.custom<typeof orders.$inferSelect>(),
          employeeName: z.string().nullable(),
        })),
      },
    },
    allIssues: {
      method: 'GET' as const,
      path: '/api/admin/issues',
      responses: {
        200: z.array(z.object({
          issue: z.custom<typeof issues.$inferSelect>(),
          employeeName: z.string().nullable(),
          orderDetails: z.custom<typeof orders.$inferSelect>().nullable(),
        })),
      },
    },
    resolveIssue: {
      method: 'PATCH' as const,
      path: '/api/admin/issues/:id/resolve',
      responses: {
        200: z.custom<typeof issues.$inferSelect>(),
      },
    },
    allEmployees: {
      method: 'GET' as const,
      path: '/api/admin/employees',
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    tracking: {
      method: 'GET' as const,
      path: '/api/admin/tracking',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          isOnline: z.boolean().nullable(),
          currentLatitude: z.number().nullable(),
          currentLongitude: z.number().nullable(),
          hasActiveIssue: z.boolean(),
          currentOrderStatus: z.string().nullable(),
        })),
      },
    },
    assignOrder: {
      method: 'PATCH' as const,
      path: '/api/admin/orders/:id/assign',
      input: z.object({ employeeId: z.number().nullable() }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
      },
    },
    syncSheets: {
      method: 'POST' as const,
      path: '/api/admin/sync-sheets',
      input: z.object({
        sheetId: z.string(),
        range: z.string().optional(),
      }),
      responses: {
        200: z.object({ imported: z.number(), updated: z.number(), errors: z.number() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type IssueInput = z.infer<typeof api.issues.create.input>;
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type RegisterInput = z.infer<typeof api.auth.register.input>;
