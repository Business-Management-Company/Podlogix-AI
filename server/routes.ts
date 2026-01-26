import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup auth before other routes
  await setupAuth(app);
  registerAuthRoutes(app);

  // Subscribers endpoint
  app.post(api.subscribers.create.path, async (req, res) => {
    try {
      const input = api.subscribers.create.input.parse(req.body);
      const subscriber = await storage.createSubscriber(input);
      res.status(201).json(subscriber);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error && 'code' in err && (err as any).code === '23505') {
        return res.status(409).json({ message: "Email already subscribed" });
      }
      throw err;
    }
  });

  // Messages endpoint
  app.post(api.messages.create.path, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      const message = await storage.createMessage(input);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Identity asset creation
  app.post(api.identity.create.path, async (req, res) => {
    try {
      const input = api.identity.create.input.parse(req.body);
      const asset = await storage.createIdentityAsset(input);
      res.status(201).json(asset);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Get identity asset by ID
  app.get(api.identity.get.path, async (req, res) => {
    const asset = await storage.getIdentityAsset(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(asset);
  });

  // Get identity assets by email
  app.get(api.identity.getByEmail.path, async (req, res) => {
    const assets = await storage.getIdentityAssetsByEmail(req.params.email);
    res.json(assets);
  });

  // Mint voice certificate on Polygon (simulated for now - would integrate with actual blockchain)
  app.post(api.identity.mint.path, async (req, res) => {
    try {
      const { voiceHash } = api.identity.mint.input.parse(req.body);
      const id = req.params.id;

      const asset = await storage.getIdentityAsset(id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Update status to minting
      await storage.updateIdentityAsset(id, { 
        certStatus: 'minting',
        voiceHash 
      });

      // Simulate blockchain minting (in production, this would call Polygon)
      // Generate a mock transaction hash and token ID
      const txHash = '0x' + crypto.randomBytes(32).toString('hex');
      const tokenId = crypto.randomBytes(4).toString('hex');
      const explorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;

      // Update with minted status
      const updated = await storage.updateIdentityAsset(id, {
        certStatus: 'minted',
        certTxHash: txHash,
        certTokenId: tokenId,
        certExplorerUrl: explorerUrl,
        mintedAt: new Date(),
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Update status to failed if minting fails
      await storage.updateIdentityAsset(req.params.id, { certStatus: 'failed' });
      return res.status(500).json({ message: 'Minting failed' });
    }
  });

  // Dashboard endpoint (protected)
  app.get(api.dashboard.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getProfileByUserId(userId);
    const podcastsList = await storage.getPodcastsByUserId(userId);
    
    let hasRssFeed = false;
    const distributionStatus: Record<string, string> = {};
    
    if (podcastsList.length > 0) {
      const feeds = await storage.getRssFeedsByPodcast(podcastsList[0].id);
      hasRssFeed = feeds.length > 0;
      const submissions = await storage.getChannelSubmissions(podcastsList[0].id);
      submissions.forEach(sub => {
        distributionStatus[sub.channelId] = sub.status;
      });
    }
    
    res.json({ profile, podcasts: podcastsList, hasRssFeed, distributionStatus });
  });

  // Profile endpoints (protected)
  app.get(api.profiles.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
  });

  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.profiles.create.input.parse({ ...req.body, userId });
      const profile = await storage.createProfile(input);
      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.profiles.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const updated = await storage.updateProfile(profile.id, req.body);
    res.json(updated);
  });

  // Public profile by slug
  app.get(api.profiles.getBySlug.path, async (req, res) => {
    const profile = await storage.getProfileBySlug(req.params.slug);
    if (!profile || !profile.isPublished) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const links = await storage.getProfileLinks(profile.id);
    res.json({ profile, links });
  });

  // Profile Links endpoints (protected)
  app.get(api.profileLinks.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json([]);
    const links = await storage.getProfileLinks(profile.id);
    res.json(links);
  });

  app.post(api.profileLinks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      if (!profile) {
        return res.status(400).json({ message: 'Create a profile first' });
      }
      const input = api.profileLinks.create.input.parse({ ...req.body, profileId: profile.id });
      const link = await storage.createProfileLink(input);
      res.status(201).json(link);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch('/api/profile/links/:id', isAuthenticated, async (req: any, res) => {
    const updated = await storage.updateProfileLink(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Link not found' });
    }
    res.json(updated);
  });

  app.delete('/api/profile/links/:id', isAuthenticated, async (req: any, res) => {
    await storage.deleteProfileLink(req.params.id);
    res.status(204).send();
  });

  // Podcasts endpoints (protected)
  app.get(api.podcasts.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const podcastsList = await storage.getPodcastsByUserId(userId);
    res.json(podcastsList);
  });

  app.post(api.podcasts.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.podcasts.create.input.parse({ ...req.body, userId });
      const podcast = await storage.createPodcast(input);
      res.status(201).json(podcast);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get('/api/podcasts/:id', isAuthenticated, async (req: any, res) => {
    const podcast = await storage.getPodcast(req.params.id);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }
    res.json(podcast);
  });

  app.patch('/api/podcasts/:id', isAuthenticated, async (req: any, res) => {
    const updated = await storage.updatePodcast(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Podcast not found' });
    }
    res.json(updated);
  });

  // RSS endpoints
  app.get('/api/podcasts/:podcastId/rss', isAuthenticated, async (req: any, res) => {
    const feeds = await storage.getRssFeedsByPodcast(req.params.podcastId);
    res.json(feeds);
  });

  app.post('/api/podcasts/:podcastId/rss', isAuthenticated, async (req: any, res) => {
    try {
      const input = api.rss.create.input.parse({ ...req.body, podcastId: req.params.podcastId });
      const feed = await storage.createRssFeed(input);
      res.status(201).json(feed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.rss.validate.path, async (req, res) => {
    try {
      const { feedUrl } = api.rss.validate.input.parse(req.body);
      // Simple validation - in production would parse RSS feed
      const isValid = feedUrl.startsWith('http') && (feedUrl.includes('rss') || feedUrl.includes('feed') || feedUrl.includes('xml'));
      res.json({ valid: isValid, episodeCount: isValid ? Math.floor(Math.random() * 50) + 5 : 0, title: isValid ? 'Your Podcast' : undefined });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post('/api/podcasts/:podcastId/rss/generate', isAuthenticated, async (req: any, res) => {
    const podcastId = req.params.podcastId;
    const podcast = await storage.getPodcast(podcastId);
    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }
    // Generate a Podlogix-hosted RSS URL
    const feedUrl = `https://feeds.podlogix.com/${podcastId}/feed.xml`;
    const feed = await storage.createRssFeed({ podcastId, feedUrl, sourceType: 'podlogix', status: 'active' });
    res.status(201).json(feed);
  });

  // Distribution endpoints
  app.get(api.distribution.channels.path, async (req, res) => {
    const channels = await storage.getDistributionChannels();
    res.json(channels);
  });

  app.get('/api/podcasts/:podcastId/distribution', isAuthenticated, async (req: any, res) => {
    const submissions = await storage.getChannelSubmissions(req.params.podcastId);
    res.json(submissions);
  });

  app.post('/api/podcasts/:podcastId/distribution/:channelId', isAuthenticated, async (req: any, res) => {
    const { podcastId, channelId } = req.params;
    // Create or update submission (simulated)
    const submission = await storage.createChannelSubmission({
      podcastId,
      channelId,
      status: 'pending',
    });
    // Simulate async approval after 2 seconds
    setTimeout(async () => {
      await storage.updateChannelSubmission(submission.id, {
        status: 'submitted',
        submittedAt: new Date(),
      });
    }, 2000);
    res.status(201).json(submission);
  });

  return httpServer;
}
