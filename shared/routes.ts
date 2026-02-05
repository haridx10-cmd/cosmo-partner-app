import { z } from 'zod';
import { insertIssueSchema, insertAttendanceSchema, insertLocationSchema, orders, issues, beauticians, attendance } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // Beuatician Profile / Status
  beautician: {
    me: {
      method: 'GET' as const,
      path: '/api/beautician/me',
      responses: {
        200: z.custom<typeof beauticians.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    toggleShift: {
      method: 'POST' as const,
      path: '/api/beautician/shift',
      input: z.object({ action: z.enum(['start_shift', 'end_shift']) }),
      responses: {
        200: z.object({ success: z.boolean(), state: z.enum(['online', 'offline']) }),
      },
    },
    updateLocation: {
      method: 'POST' as const,
      path: '/api/beautician/location',
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
        status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
        date: z.string().optional(), // YYYY-MM-DD
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
      input: insertIssueSchema.omit({ beauticianId: true }), // Beautician ID inferred from session
      responses: {
        201: z.custom<typeof issues.$inferSelect>(),
      },
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
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

// ============================================
// TYPE HELPERS
// ============================================
export type OrderResponse = z.infer<typeof api.orders.get.responses[200]>;
export type IssueInput = z.infer<typeof api.issues.create.input>;
