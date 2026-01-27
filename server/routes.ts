import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { mintVoiceCertificate, isBlockchainConfigured, getWalletBalance } from "./blockchain";
import { getMetaApiStatus, checkForPotentialImpersonators, isMetaConfigured } from "./services/metaApi";
import { 
  getSpotifyAuthUrl, 
  exchangeCodeForTokens, 
  getSpotifyUserProfile, 
  isSpotifyConnectedForUser, 
  getUserSavedShowsForUser, 
  searchPodcastsForUser, 
  getShowDetailsForUser,
  getRssFeedFromSpotify 
} from "./services/spotifyService";
import { parseFeed, validateFeed, getLatestEpisodes } from "./services/rssService";
import { insertPodcastSubscriptionSchema, insertUserInterestSchema, insertEpisodeBriefingSchema, insertNotificationSchema } from "@shared/schema";
import { transcribeEpisode, processEpisodeBriefing } from "./services/briefingService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint for Cloud Run
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Setup auth before other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register AI chat routes
  registerChatRoutes(app);
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const asset = await storage.getIdentityAsset(id);
    if (!asset) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(asset);
  });

  // Get identity assets by email
  app.get(api.identity.getByEmail.path, async (req, res) => {
    const email = Array.isArray(req.params.email) ? req.params.email[0] : req.params.email;
    const assets = await storage.getIdentityAssetsByEmail(email);
    res.json(assets);
  });

  // Update identity asset (protected - owner only)
  app.patch("/api/identity/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userEmail = req.user?.claims?.email;
      
      const asset = await storage.getIdentityAsset(id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Verify ownership - user can only update their own assets
      if (asset.email !== userEmail) {
        return res.status(403).json({ message: 'You can only update your own assets' });
      }

      const { likenessImages, ...otherUpdates } = req.body;
      const updates: any = { ...otherUpdates };
      
      if (likenessImages) {
        updates.likenessImages = likenessImages;
      }

      const updated = await storage.updateIdentityAsset(id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating identity asset:", err);
      return res.status(500).json({ message: 'Failed to update asset' });
    }
  });

  // Mint voice certificate on Polygon blockchain
  app.post(api.identity.mint.path, isAuthenticated, async (req: any, res) => {
    try {
      const { voiceHash } = api.identity.mint.input.parse(req.body);
      const id = req.params.id;
      const userEmail = req.user?.claims?.email;

      const asset = await storage.getIdentityAsset(id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Verify ownership - user can only mint their own assets
      if (asset.email !== userEmail) {
        return res.status(403).json({ message: 'You can only mint certificates for your own assets' });
      }

      // Update status to minting
      await storage.updateIdentityAsset(id, { 
        certStatus: 'minting',
        voiceHash 
      });

      // Mint on Polygon blockchain
      const mintResult = await mintVoiceCertificate(
        voiceHash,
        asset.name,
        asset.email
      );

      if (!mintResult.success) {
        await storage.updateIdentityAsset(id, { certStatus: 'failed' });
        return res.status(500).json({ 
          message: mintResult.error || 'Blockchain minting failed' 
        });
      }

      // Update with minted status
      const updated = await storage.updateIdentityAsset(id, {
        certStatus: 'minted',
        certTxHash: mintResult.txHash,
        certTokenId: mintResult.tokenId,
        certExplorerUrl: mintResult.explorerUrl,
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
      console.error("Minting error:", err);
      await storage.updateIdentityAsset(req.params.id, { certStatus: 'failed' });
      return res.status(500).json({ message: 'Minting failed' });
    }
  });

  // Mint likeness certificate on Polygon blockchain
  app.post("/api/identity/:id/mint-likeness", isAuthenticated, async (req: any, res) => {
    try {
      const { likenessHash } = req.body;
      const id = req.params.id;
      const userEmail = req.user?.claims?.email;

      if (!likenessHash) {
        return res.status(400).json({ message: 'Likeness hash is required' });
      }

      const asset = await storage.getIdentityAsset(id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Verify ownership - user can only mint their own assets
      if (asset.email !== userEmail) {
        return res.status(403).json({ message: 'You can only mint certificates for your own assets' });
      }

      // Update status to minting
      await storage.updateIdentityAsset(id, { 
        certStatus: 'minting',
        likenessHash 
      });

      // Mint on Polygon blockchain (using same function, different data)
      const mintResult = await mintVoiceCertificate(
        likenessHash,
        asset.name,
        asset.email
      );

      if (!mintResult.success) {
        await storage.updateIdentityAsset(id, { certStatus: 'failed' });
        return res.status(500).json({ 
          message: mintResult.error || 'Blockchain minting failed' 
        });
      }

      // Update with minted status
      const updated = await storage.updateIdentityAsset(id, {
        certStatus: 'minted',
        certTxHash: mintResult.txHash,
        certTokenId: mintResult.tokenId,
        certExplorerUrl: mintResult.explorerUrl,
        mintedAt: new Date(),
      });

      res.json(updated);
    } catch (err) {
      console.error("Likeness minting error:", err);
      await storage.updateIdentityAsset(req.params.id, { certStatus: 'failed' });
      return res.status(500).json({ message: 'Minting failed' });
    }
  });

  // Blockchain status endpoint
  app.get("/api/blockchain/status", async (_req, res) => {
    const configured = isBlockchainConfigured();
    let balance = null;
    
    if (configured) {
      balance = await getWalletBalance();
    }
    
    res.json({
      configured,
      network: configured ? "Polygon Mainnet" : null,
      walletBalance: balance ? `${balance} MATIC` : null,
    });
  });

  // Meta API status endpoint (protected)
  app.get("/api/social/meta/status", isAuthenticated, async (_req, res) => {
    try {
      const status = await getMetaApiStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching Meta status:", error);
      res.json({ configured: isMetaConfigured(), connected: false, instagramAccount: null, facebookPages: [] });
    }
  });

  // Check for potential impersonators (protected)
  app.post("/api/social/scan-impersonators", isAuthenticated, async (req: any, res) => {
    try {
      const { userName, userBio } = req.body;
      
      if (!userName) {
        return res.status(400).json({ message: 'User name is required for scanning' });
      }

      const alerts = await checkForPotentialImpersonators(userName, userBio);
      res.json({ alerts, scannedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error scanning for impersonators:", error);
      res.status(500).json({ message: 'Failed to scan for impersonators' });
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
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const profile = await storage.getProfileBySlug(slug);
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

  // ===========================================
  // PODCAST LISTENER FEATURES
  // ===========================================

  // Spotify OAuth: Initiate login
  app.get('/api/listener/spotify/auth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/listener/spotify/callback`;
      
      const authUrl = getSpotifyAuthUrl(redirectUri, userId);
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating Spotify auth URL:', error);
      res.status(500).json({ message: 'Failed to initiate Spotify login' });
    }
  });

  // Spotify OAuth: Callback (validates state matches authenticated user)
  app.get('/api/listener/spotify/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect('/listener?spotify_error=missing_params');
      }

      const authenticatedUserId = req.user?.claims?.sub;
      if (!authenticatedUserId) {
        return res.redirect('/login?return_to=/listener&spotify_error=not_authenticated');
      }

      if (state !== authenticatedUserId) {
        console.error('Spotify OAuth state mismatch - potential CSRF');
        return res.redirect('/listener?spotify_error=auth_failed');
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/listener/spotify/callback`;

      const tokens = await exchangeCodeForTokens(code as string, redirectUri);
      const profile = await getSpotifyUserProfile(tokens.accessToken);
      
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      
      await storage.upsertSpotifyConnection({
        userId: authenticatedUserId,
        spotifyUserId: profile.id,
        displayName: profile.displayName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        scope: tokens.scope,
      });

      res.redirect('/listener?spotify_connected=true');
    } catch (error) {
      console.error('Spotify callback error:', error);
      res.redirect('/listener?spotify_error=auth_failed');
    }
  });

  // Spotify integration status (per-user)
  app.get('/api/listener/spotify/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const connected = await isSpotifyConnectedForUser(userId);
      const connection = connected ? await storage.getSpotifyConnection(userId) : null;
      res.json({ 
        connected, 
        displayName: connection?.displayName || null,
        spotifyUserId: connection?.spotifyUserId || null
      });
    } catch (error) {
      console.error('Spotify connection check error:', error);
      res.json({ connected: false });
    }
  });

  // Disconnect Spotify
  app.delete('/api/listener/spotify/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.deleteSpotifyConnection(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      res.status(500).json({ message: 'Failed to disconnect Spotify' });
    }
  });

  // Get user's followed podcasts from Spotify (per-user)
  app.get('/api/listener/spotify/shows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const shows = await getUserSavedShowsForUser(userId);
      res.json(shows);
    } catch (error) {
      console.error('Error fetching Spotify shows:', error);
      res.status(500).json({ message: 'Failed to fetch Spotify shows' });
    }
  });

  // Search podcasts on Spotify (per-user)
  app.get('/api/listener/spotify/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: 'Search query required' });
      }
      const shows = await searchPodcastsForUser(userId, query);
      res.json(shows);
    } catch (error) {
      console.error('Error searching Spotify:', error);
      res.status(500).json({ message: 'Failed to search podcasts' });
    }
  });

  // Import podcast from Spotify (per-user)
  app.post('/api/listener/spotify/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { showId } = req.body;
      
      const show = await getShowDetailsForUser(userId, showId);
      if (!show) {
        return res.status(404).json({ message: 'Show not found' });
      }

      const rssFeed = await getRssFeedFromSpotify(showId);
      
      const subscription = await storage.createPodcastSubscription({
        userId,
        title: show.name,
        author: show.publisher,
        description: show.description,
        artworkUrl: show.imageUrl,
        feedUrl: rssFeed || show.externalUrl,
        spotifyShowId: show.id,
        isActive: true,
      });
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Error importing Spotify show:', error);
      res.status(500).json({ message: 'Failed to import podcast' });
    }
  });

  // Get user's podcast subscriptions
  app.get('/api/listener/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const subscriptions = await storage.getPodcastSubscriptionsByUserId(userId);
      res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
  });

  // Subscribe to podcast via RSS feed
  app.post('/api/listener/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { feedUrl } = req.body;
      
      // Validate and parse the feed
      const feedData = await parseFeed(feedUrl);
      
      const subscription = await storage.createPodcastSubscription({
        userId,
        title: feedData.title,
        author: feedData.author,
        description: feedData.description,
        artworkUrl: feedData.imageUrl,
        feedUrl,
        isActive: true,
      });
      
      // Fetch and store latest episodes
      const episodes = feedData.episodes.slice(0, 10);
      for (const ep of episodes) {
        await storage.createSubscriptionEpisode({
          subscriptionId: subscription.id,
          userId,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          duration: ep.duration,
          publishedAt: ep.publishedAt,
          guid: ep.guid,
          transcriptStatus: 'pending',
          briefingStatus: 'pending',
          isRead: false,
        });
      }
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: 'Failed to subscribe to podcast' });
    }
  });

  // Unsubscribe from podcast
  app.delete('/api/listener/subscriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const sub = await storage.getPodcastSubscription(req.params.id);
      
      if (!sub || sub.userId !== userId) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
      
      await storage.deletePodcastSubscription(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  });

  // Get episodes for user (all subscriptions)
  app.get('/api/listener/episodes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const episodes = await storage.getSubscriptionEpisodesByUser(userId);
      res.json(episodes);
    } catch (error) {
      console.error('Error fetching episodes:', error);
      res.status(500).json({ message: 'Failed to fetch episodes' });
    }
  });

  // Get episodes for specific subscription
  app.get('/api/listener/subscriptions/:id/episodes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const sub = await storage.getPodcastSubscription(req.params.id);
      
      if (!sub || sub.userId !== userId) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
      
      const episodes = await storage.getSubscriptionEpisodesBySubscription(req.params.id);
      res.json(episodes);
    } catch (error) {
      console.error('Error fetching subscription episodes:', error);
      res.status(500).json({ message: 'Failed to fetch episodes' });
    }
  });

  // Mark episode as read
  app.patch('/api/listener/episodes/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const episode = await storage.getSubscriptionEpisode(req.params.id);
      
      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      const updated = await storage.updateSubscriptionEpisode(req.params.id, { isRead: true });
      res.json(updated);
    } catch (error) {
      console.error('Error marking episode read:', error);
      res.status(500).json({ message: 'Failed to update episode' });
    }
  });

  // Transcribe episode (uses OpenAI Whisper)
  app.post('/api/listener/episodes/:id/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const episode = await storage.getSubscriptionEpisode(req.params.id);
      
      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      if (!episode.audioUrl) {
        return res.status(400).json({ message: 'Episode has no audio URL' });
      }
      
      // Start transcription in background
      transcribeEpisode(req.params.id, userId).catch(err => {
        console.error('Background transcription error:', err);
      });
      
      res.json({ message: 'Transcription started', status: 'processing' });
    } catch (error) {
      console.error('Error starting transcription:', error);
      res.status(500).json({ message: 'Failed to start transcription' });
    }
  });

  // Generate briefing for episode
  app.post('/api/listener/episodes/:id/briefing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const episode = await storage.getSubscriptionEpisode(req.params.id);
      
      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      if (!episode.transcript) {
        return res.status(400).json({ message: 'Episode must be transcribed first' });
      }
      
      // Start briefing generation in background
      processEpisodeBriefing(req.params.id, userId).catch(err => {
        console.error('Background briefing generation error:', err);
      });
      
      res.json({ message: 'Briefing generation started', status: 'processing' });
    } catch (error) {
      console.error('Error starting briefing generation:', error);
      res.status(500).json({ message: 'Failed to generate briefing' });
    }
  });

  // Get briefing for specific episode
  app.get('/api/listener/episodes/:id/briefing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const episode = await storage.getSubscriptionEpisode(req.params.id);
      
      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      const briefing = await storage.getEpisodeBriefingByEpisode(req.params.id);
      if (!briefing) {
        return res.status(404).json({ message: 'Briefing not found' });
      }
      
      res.json(briefing);
    } catch (error) {
      console.error('Error fetching episode briefing:', error);
      res.status(500).json({ message: 'Failed to fetch briefing' });
    }
  });

  // ===========================================
  // USER INTERESTS (for personalized briefings)
  // ===========================================

  // Get user interests
  app.get('/api/listener/interests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const interests = await storage.getUserInterests(userId);
      res.json(interests);
    } catch (error) {
      console.error('Error fetching interests:', error);
      res.status(500).json({ message: 'Failed to fetch interests' });
    }
  });

  // Add user interest
  app.post('/api/listener/interests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const input = insertUserInterestSchema.parse({ ...req.body, userId });
      const interest = await storage.createUserInterest(input);
      res.status(201).json(interest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Error creating interest:', error);
      res.status(500).json({ message: 'Failed to create interest' });
    }
  });

  // Update user interest
  app.patch('/api/listener/interests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const interests = await storage.getUserInterests(userId);
      const interest = interests.find(i => i.id === req.params.id);
      
      if (!interest) {
        return res.status(404).json({ message: 'Interest not found' });
      }
      
      const updated = await storage.updateUserInterest(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating interest:', error);
      res.status(500).json({ message: 'Failed to update interest' });
    }
  });

  // Delete user interest
  app.delete('/api/listener/interests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const interests = await storage.getUserInterests(userId);
      const interest = interests.find(i => i.id === req.params.id);
      
      if (!interest) {
        return res.status(404).json({ message: 'Interest not found' });
      }
      
      await storage.deleteUserInterest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting interest:', error);
      res.status(500).json({ message: 'Failed to delete interest' });
    }
  });

  // ===========================================
  // EPISODE BRIEFINGS
  // ===========================================

  // Get all briefings for user
  app.get('/api/listener/briefings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const briefings = await storage.getEpisodeBriefingsByUser(userId);
      res.json(briefings);
    } catch (error) {
      console.error('Error fetching briefings:', error);
      res.status(500).json({ message: 'Failed to fetch briefings' });
    }
  });

  // Get specific briefing
  app.get('/api/listener/briefings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const briefing = await storage.getEpisodeBriefing(req.params.id);
      
      if (!briefing || briefing.userId !== userId) {
        return res.status(404).json({ message: 'Briefing not found' });
      }
      
      res.json(briefing);
    } catch (error) {
      console.error('Error fetching briefing:', error);
      res.status(500).json({ message: 'Failed to fetch briefing' });
    }
  });

  // Toggle bookmark on briefing
  app.patch('/api/listener/briefings/:id/bookmark', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const briefing = await storage.getEpisodeBriefing(req.params.id);
      
      if (!briefing || briefing.userId !== userId) {
        return res.status(404).json({ message: 'Briefing not found' });
      }
      
      const updated = await storage.updateEpisodeBriefing(req.params.id, { 
        isBookmarked: !briefing.isBookmarked 
      });
      res.json(updated);
    } catch (error) {
      console.error('Error updating briefing bookmark:', error);
      res.status(500).json({ message: 'Failed to update briefing' });
    }
  });

  // ===========================================
  // NOTIFICATIONS
  // ===========================================

  // Get all notifications
  app.get('/api/listener/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Get unread notification count
  app.get('/api/listener/notifications/unread', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json({ count: notifications.length, notifications });
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.patch('/api/listener/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  // Mark all notifications as read
  app.patch('/api/listener/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      res.status(500).json({ message: 'Failed to update notifications' });
    }
  });

  return httpServer;
}
