import { z } from 'zod';
import { 
  insertSubscriberSchema, insertMessageSchema, insertIdentityAssetSchema, 
  insertProfileSchema, insertProfileLinkSchema, insertPodcastSchema, insertRssFeedSchema,
  subscribers, messages, identityAssets, profiles, profileLinks, podcasts, rssFeeds, distributionChannels, channelSubmissions 
} from './schema';

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
  // Dashboard
  dashboard: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard',
      responses: {
        200: z.object({
          profile: z.custom<typeof profiles.$inferSelect>().nullable(),
          podcasts: z.array(z.custom<typeof podcasts.$inferSelect>()),
          hasRssFeed: z.boolean(),
          distributionStatus: z.record(z.string()),
        }),
        401: z.object({ message: z.string() }),
      },
    },
  },
  // Profiles
  profiles: {
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getBySlug: {
      method: 'GET' as const,
      path: '/api/p/:slug',
      responses: {
        200: z.object({
          profile: z.custom<typeof profiles.$inferSelect>(),
          links: z.array(z.custom<typeof profileLinks.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/profile',
      input: insertProfileSchema,
      responses: {
        201: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profile',
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Profile Links
  profileLinks: {
    list: {
      method: 'GET' as const,
      path: '/api/profile/links',
      responses: {
        200: z.array(z.custom<typeof profileLinks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/profile/links',
      input: insertProfileLinkSchema,
      responses: {
        201: z.custom<typeof profileLinks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profile/links/:id',
      input: insertProfileLinkSchema.partial(),
      responses: {
        200: z.custom<typeof profileLinks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/profile/links/:id',
      responses: {
        204: z.undefined(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Podcasts
  podcasts: {
    list: {
      method: 'GET' as const,
      path: '/api/podcasts',
      responses: {
        200: z.array(z.custom<typeof podcasts.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/podcasts/:id',
      responses: {
        200: z.custom<typeof podcasts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/podcasts',
      input: insertPodcastSchema,
      responses: {
        201: z.custom<typeof podcasts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/podcasts/:id',
      input: insertPodcastSchema.partial(),
      responses: {
        200: z.custom<typeof podcasts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  // RSS Feeds
  rss: {
    list: {
      method: 'GET' as const,
      path: '/api/podcasts/:podcastId/rss',
      responses: {
        200: z.array(z.custom<typeof rssFeeds.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/podcasts/:podcastId/rss',
      input: insertRssFeedSchema,
      responses: {
        201: z.custom<typeof rssFeeds.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    validate: {
      method: 'POST' as const,
      path: '/api/rss/validate',
      input: z.object({ feedUrl: z.string().url() }),
      responses: {
        200: z.object({ valid: z.boolean(), episodeCount: z.number(), title: z.string().optional() }),
        400: errorSchemas.validation,
      },
    },
    generateHosted: {
      method: 'POST' as const,
      path: '/api/podcasts/:podcastId/rss/generate',
      responses: {
        201: z.custom<typeof rssFeeds.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  // Distribution
  distribution: {
    channels: {
      method: 'GET' as const,
      path: '/api/distribution/channels',
      responses: {
        200: z.array(z.custom<typeof distributionChannels.$inferSelect>()),
      },
    },
    submissions: {
      method: 'GET' as const,
      path: '/api/podcasts/:podcastId/distribution',
      responses: {
        200: z.array(z.custom<typeof channelSubmissions.$inferSelect>()),
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/podcasts/:podcastId/distribution/:channelId',
      responses: {
        201: z.custom<typeof channelSubmissions.$inferSelect>(),
        400: errorSchemas.validation,
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
