import { z } from 'zod';
import { insertSubscriberSchema, insertMessageSchema, insertIdentityAssetSchema, subscribers, messages, identityAssets } from './schema';

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

export const api = {
  subscribers: {
    create: {
      method: 'POST' as const,
      path: '/api/subscribers',
      input: insertSubscriberSchema,
      responses: {
        201: z.custom<typeof subscribers.$inferSelect>(),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }),
      },
    },
  },
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/messages',
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  identity: {
    create: {
      method: 'POST' as const,
      path: '/api/identity',
      input: insertIdentityAssetSchema,
      responses: {
        201: z.custom<typeof identityAssets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/identity/:id',
      responses: {
        200: z.custom<typeof identityAssets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getByEmail: {
      method: 'GET' as const,
      path: '/api/identity/email/:email',
      responses: {
        200: z.array(z.custom<typeof identityAssets.$inferSelect>()),
      },
    },
    mint: {
      method: 'POST' as const,
      path: '/api/identity/:id/mint',
      input: z.object({
        voiceHash: z.string(),
      }),
      responses: {
        200: z.custom<typeof identityAssets.$inferSelect>(),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
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
