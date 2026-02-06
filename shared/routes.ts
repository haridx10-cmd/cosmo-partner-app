import { z } from 'zod';
import { insertIssueSchema, employees, orders, issues } from './schema';

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
      input: z.object({ latitude: z.number(), longitude: z.number() }),
      responses: {
        200: z.object({ success: z.boolean() }),
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
      input: z.object({ status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']) }),
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
