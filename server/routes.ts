import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin, isSuperAdmin, authStorage } from "./replit_integrations/auth";
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
  getRssFeedFromSpotify,
  getPlaylistForUser,
  createOrGetBriefingsPlaylist,
  searchSpotifyEpisode,
  addEpisodeToPlaylist
} from "./services/spotifyService";
import { parseFeed, validateFeed, getLatestEpisodes } from "./services/rssService";
import { insertPodcastSubscriptionSchema, insertUserInterestSchema, insertEpisodeBriefingSchema, insertNotificationSchema } from "@shared/schema";
import { transcribeEpisode, processEpisodeBriefing } from "./services/briefingService";
import { syncAllSubscriptionsForUser, processAutoBriefingsForUser } from "./services/episodeSyncService";
import { 
  isModashConfigured, 
  searchInfluencers, 
  getInfluencerProfile 
} from "./services/modashService";
import { 
  isPhylloConfigured,
  getOrCreatePhylloUser,
  createSDKToken,
  getConnectedSocialAccounts,
  disconnectAccount,
  getPhylloStatus,
  getSupportedPlatforms
} from "./services/phylloService";
import {
  isYouTubeConfigured,
  searchYouTubeChannels,
  getChannelDetails,
  getChannelVideos,
  calculateEngagementRate
} from "./services/youtubeService";
import {
  isInstagramOAuthConfigured,
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramBusinessAccount,
  refreshInstagramAnalytics
} from "./services/instagramOAuth";
import {
  isInstagramLookupConfigured,
  lookupInstagramProfile,
  searchInstagramInfluencers
} from "./services/instagramLookupService";
import {
  discoverInfluencersByHashtag,
  checkHashtagServiceStatus
} from "./services/instagramHashtagService";
import {
  isLinkedInOAuthConfigured,
  getLinkedInAuthUrl,
  exchangeCodeForToken as linkedinExchangeCodeForToken,
  getLinkedInProfile
} from "./services/linkedinOAuth";
import {
  isLinkedInDiscoveryConfigured,
  extractLinkedInProfileInfo,
  extractLinkedInCompanyInfo,
  getLinkedInSearchUrl,
  getLinkedInHashtagUrl,
  generateLinkedInSearchSuggestions
} from "./services/linkedinDiscoveryService";
import { insertSavedInfluencerSchema, insertHashtagMonitorSchema, modashSearchSchema, insertConnectedSocialAccountSchema } from "@shared/schema";
import { generateEmailWithAI, improveEmailWithAI, generateSubjectLines } from "./services/aiEmailService";
import { sendEmail, isEmailConfigured } from "./services/emailService";
import { analyzeLink, generateBioAndHeadlines, suggestLinksForPodcast, improveBio, quickLinkTemplates } from "./services/aiProfileService";

async function sendEmailCampaign(campaignId: string, userId: string, recipientIds?: string[]) {
  // Check if email is configured first
  if (!isEmailConfigured()) {
    throw new Error('Email service is not configured');
  }

  const campaign = await storage.getEmailCampaign(campaignId);
  if (!campaign || campaign.userId !== userId) {
    throw new Error('Campaign not found');
  }

  const contacts = await storage.getEmailContacts(userId);
  const recipients = recipientIds 
    ? contacts.filter(c => recipientIds.includes(c.id))
    : contacts.filter(c => c.isSubscribed);

  // Check for empty recipients
  if (recipients.length === 0) {
    throw new Error('No recipients selected for this campaign');
  }

  let successCount = 0;
  let failCount = 0;

  for (const contact of recipients) {
    try {
      let personalizedBody = campaign.body;
      let personalizedSubject = campaign.subject;
      
      // Replace personalization tokens with actual values or remove them
      personalizedBody = personalizedBody
        .replace(/\{\{firstName\}\}/g, contact.firstName || '')
        .replace(/\{\{lastName\}\}/g, contact.lastName || '')
        .replace(/\{\{email\}\}/g, contact.email);
      personalizedSubject = personalizedSubject
        .replace(/\{\{firstName\}\}/g, contact.firstName || '')
        .replace(/\{\{lastName\}\}/g, contact.lastName || '')
        .replace(/\{\{email\}\}/g, contact.email);

      const sent = await sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        text: personalizedBody.replace(/<[^>]*>/g, ''),
        html: personalizedBody,
      });

      if (sent) {
        successCount++;
        await storage.updateEmailContact(contact.id, userId, { lastEmailedAt: new Date() });
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`Failed to send to ${contact.email}:`, error);
      failCount++;
    }
  }

  // Only mark as sent if at least one email was successful
  if (successCount > 0) {
    await storage.updateEmailCampaign(campaignId, userId, {
      status: 'sent',
      sentAt: new Date(),
      recipientCount: successCount,
    });
  }

  return { success: successCount > 0, sent: successCount, failed: failCount };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint for Cloud Run
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Meta/Instagram Webhook verification (GET)
  const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'podlogix_meta_webhook_2024';
  
  app.get("/api/webhooks/meta", (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
      console.log('Meta webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('Meta webhook verification failed');
      res.sendStatus(403);
    }
  });

  // Meta/Instagram Webhook events (POST)
  app.post("/api/webhooks/meta", (req, res) => {
    const body = req.body;
    console.log('Meta webhook event received:', JSON.stringify(body, null, 2));
    
    // Process different event types
    if (body.object === 'instagram') {
      // Handle Instagram events (mentions, comments, etc.)
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          console.log('Instagram change:', change.field, change.value);
        });
      });
    }
    
    // Always return 200 to acknowledge receipt
    res.sendStatus(200);
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

  // Phyllo Social Monitoring API routes
  
  // Get Phyllo status and supported platforms (public endpoint - just returns config status)
  app.get("/api/social/phyllo/status", async (_req, res) => {
    try {
      const status = await getPhylloStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching Phyllo status:", error);
      res.json({ configured: false, supportedPlatforms: getSupportedPlatforms() });
    }
  });

  // Get SDK token for connecting a social account
  app.post("/api/social/phyllo/sdk-token", isAuthenticated, async (req: any, res) => {
    console.log("=== Phyllo SDK Token Request ===");
    try {
      const userId = req.user.claims.sub;
      const userName = `${req.user.claims.first_name || ''} ${req.user.claims.last_name || ''}`.trim() || req.user.claims.email;
      console.log(`Phyllo request for user: ${userId}, name: ${userName}`);
      
      if (!isPhylloConfigured()) {
        console.log("Phyllo not configured");
        return res.status(503).json({ error: 'Social monitoring service not configured' });
      }
      console.log("Phyllo is configured, creating user...");

      const phylloUser = await getOrCreatePhylloUser(userId, userName);
      console.log("Phyllo user result:", phylloUser);
      if (!phylloUser) {
        console.log("Failed to create Phyllo user");
        return res.status(500).json({ error: 'Failed to create monitoring user' });
      }

      const sdkToken = await createSDKToken(phylloUser.id, ['IDENTITY', 'ENGAGEMENT']);
      if (!sdkToken) {
        return res.status(500).json({ error: 'Failed to create SDK token' });
      }

      res.json({
        sdkToken: sdkToken.sdk_token,
        expiresAt: sdkToken.expires_at,
        userId: phylloUser.id,
      });
    } catch (error) {
      console.error("Error creating Phyllo SDK token:", error);
      res.status(500).json({ error: 'Failed to initialize social connection' });
    }
  });

  // Get connected social accounts for the current user
  app.get("/api/social/phyllo/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get from our database
      const accounts = await storage.getConnectedSocialAccountsByUser(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      res.status(500).json({ error: 'Failed to fetch connected accounts' });
    }
  });

  // Save a newly connected social account (called after Phyllo SDK success)
  app.post("/api/social/phyllo/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertConnectedSocialAccountSchema.safeParse({ ...req.body, userId });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid account data', details: parseResult.error.issues });
      }

      const account = await storage.createConnectedSocialAccount(parseResult.data);
      res.json(account);
    } catch (error) {
      console.error("Error saving connected account:", error);
      res.status(500).json({ error: 'Failed to save connected account' });
    }
  });

  // Disconnect a social account
  app.delete("/api/social/phyllo/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const account = await storage.getConnectedSocialAccount(id);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Disconnect from Phyllo if we have the account ID
      if (account.phylloAccountId && isPhylloConfigured()) {
        await disconnectAccount(account.phylloAccountId);
      }

      await storage.deleteConnectedSocialAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      res.status(500).json({ error: 'Failed to disconnect account' });
    }
  });

  // Get monitoring alerts for the current user
  app.get("/api/social/phyllo/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unresolvedOnly = req.query.unresolvedOnly === 'true';
      
      const alerts = unresolvedOnly 
        ? await storage.getUnresolvedAlertsByUser(userId)
        : await storage.getSocialMonitoringAlertsByUser(userId);
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // Resolve an alert
  app.patch("/api/social/phyllo/alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const alerts = await storage.getSocialMonitoringAlertsByUser(userId);
      const alert = alerts.find(a => a.id === id);
      
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      const updated = await storage.updateSocialMonitoringAlert(id, {
        isResolved: true,
        resolvedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  // Creator Social Profiles (native API integration)
  app.get("/api/creator/social-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getCreatorSocialProfilesByUser(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching social profiles:", error);
      res.status(500).json({ error: 'Failed to fetch social profiles' });
    }
  });

  app.post("/api/creator/social-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { platform, profileUrl } = req.body;

      if (!platform || !profileUrl) {
        return res.status(400).json({ error: 'Platform and profile URL are required' });
      }

      const existing = await storage.getCreatorSocialProfileByPlatform(userId, platform);
      if (existing) {
        return res.status(400).json({ error: `You already have a ${platform} profile connected` });
      }

      let profileData: any = {
        userId,
        platform,
        profileUrl,
        verified: false,
      };

      if (platform === 'youtube') {
        const { resolveChannelFromUrl } = await import('./services/youtubeService');
        const channel = await resolveChannelFromUrl(profileUrl);
        
        if (channel) {
          profileData = {
            ...profileData,
            username: channel.customUrl || channel.title,
            displayName: channel.title,
            profilePictureUrl: channel.thumbnailUrl,
            youtubeChannelId: channel.channelId,
            subscriberCount: channel.subscriberCount,
            videoCount: channel.videoCount,
            viewCount: channel.viewCount,
            verified: true,
            lastSyncedAt: new Date(),
          };
        }
      } else {
        const urlMatch = profileUrl.match(/(?:@|\/)?([a-zA-Z0-9_.-]+)\/?$/);
        profileData.username = urlMatch?.[1] || profileUrl;
        profileData.verified = true;
      }

      const created = await storage.createCreatorSocialProfile(profileData);
      res.json(created);
    } catch (error) {
      console.error("Error adding social profile:", error);
      res.status(500).json({ error: 'Failed to add social profile' });
    }
  });

  app.post("/api/creator/social-profiles/:id/sync", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const profile = await storage.getCreatorSocialProfile(id);
      if (!profile || profile.userId !== userId) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (profile.platform === 'youtube' && profile.youtubeChannelId) {
        const { getChannelDetails } = await import('./services/youtubeService');
        const channel = await getChannelDetails(profile.youtubeChannelId);
        
        if (channel) {
          const updated = await storage.updateCreatorSocialProfile(id, {
            displayName: channel.title,
            profilePictureUrl: channel.thumbnailUrl,
            subscriberCount: channel.subscriberCount,
            videoCount: channel.videoCount,
            viewCount: channel.viewCount,
            lastSyncedAt: new Date(),
          });
          return res.json(updated);
        }
      }

      res.json(profile);
    } catch (error) {
      console.error("Error syncing social profile:", error);
      res.status(500).json({ error: 'Failed to sync social profile' });
    }
  });

  app.delete("/api/creator/social-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const profile = await storage.getCreatorSocialProfile(id);
      if (!profile || profile.userId !== userId) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      await storage.deleteCreatorSocialProfile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting social profile:", error);
      res.status(500).json({ error: 'Failed to delete social profile' });
    }
  });

  // Instagram OAuth routes for creator profiles
  app.get("/api/creator/instagram/status", async (req, res) => {
    res.json({
      configured: isInstagramOAuthConfigured(),
    });
  });

  app.get("/api/creator/instagram/auth", isAuthenticated, async (req: any, res) => {
    try {
      if (!isInstagramOAuthConfigured()) {
        return res.status(400).json({ error: 'Instagram OAuth not configured' });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/instagram/callback`;
      
      const userId = req.user.claims.sub;
      const timestamp = Date.now();
      const stateData = JSON.stringify({ userId, timestamp });
      const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'instagram-oauth-secret')
        .update(stateData)
        .digest('hex');
      const state = Buffer.from(JSON.stringify({ data: stateData, sig: signature })).toString('base64');
      
      const authUrl = getInstagramAuthUrl(redirectUri, state);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating Instagram auth URL:", error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  });

  app.get("/api/creator/instagram/callback", async (req, res) => {
    try {
      const { code, state, error: authError, error_description } = req.query;

      if (authError) {
        console.error("Instagram auth error:", authError, error_description);
        return res.redirect('/connectors?instagram_error=auth_denied');
      }

      if (!code || !state) {
        return res.redirect('/connectors?instagram_error=missing_params');
      }

      let userId: string;
      try {
        const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString());
        const { data: stateData, sig } = stateObj;
        
        const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'instagram-oauth-secret')
          .update(stateData)
          .digest('hex');
        
        if (sig !== expectedSig) {
          console.error("Instagram OAuth state signature mismatch");
          return res.redirect('/connectors?instagram_error=invalid_state');
        }
        
        const parsed = JSON.parse(stateData);
        userId = parsed.userId;
        
        const stateAge = Date.now() - parsed.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          return res.redirect('/connectors?instagram_error=state_expired');
        }
      } catch (e) {
        console.error("Instagram OAuth state parsing error:", e);
        return res.redirect('/connectors?instagram_error=invalid_state');
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/instagram/callback`;

      const tokens = await exchangeCodeForToken(code as string, redirectUri);
      if (!tokens) {
        return res.redirect('/connectors?instagram_error=token_exchange_failed');
      }

      const longLivedTokens = await getLongLivedToken(tokens.accessToken);
      const accessToken = longLivedTokens?.accessToken || tokens.accessToken;
      const expiresAt = longLivedTokens?.expiresAt || tokens.expiresAt;

      const instagramAccount = await getInstagramBusinessAccount(accessToken);
      if (!instagramAccount) {
        return res.redirect('/connectors?instagram_error=no_business_account');
      }

      const existingProfiles = await storage.getCreatorSocialProfilesByUser(userId);
      const existingInstagram = existingProfiles.find(p => p.platform === 'instagram');
      
      if (existingInstagram) {
        await storage.updateCreatorSocialProfile(existingInstagram.id, {
          username: instagramAccount.username,
          displayName: instagramAccount.name || instagramAccount.username,
          profilePictureUrl: instagramAccount.profilePictureUrl,
          instagramAccountId: instagramAccount.id,
          instagramAccessToken: accessToken,
          instagramTokenExpiresAt: expiresAt,
          followersCount: instagramAccount.followersCount,
          followingCount: instagramAccount.followingCount,
          mediaCount: instagramAccount.mediaCount,
          verified: true,
          lastSyncedAt: new Date(),
        });
      } else {
        await storage.createCreatorSocialProfile({
          userId,
          platform: 'instagram',
          profileUrl: `https://instagram.com/${instagramAccount.username}`,
          username: instagramAccount.username,
          displayName: instagramAccount.name || instagramAccount.username,
          profilePictureUrl: instagramAccount.profilePictureUrl,
          instagramAccountId: instagramAccount.id,
          instagramAccessToken: accessToken,
          instagramTokenExpiresAt: expiresAt,
          followersCount: instagramAccount.followersCount,
          followingCount: instagramAccount.followingCount,
          mediaCount: instagramAccount.mediaCount,
          verified: true,
          lastSyncedAt: new Date(),
        });
      }

      res.redirect('/connectors?instagram_connected=true');
    } catch (error) {
      console.error("Instagram callback error:", error);
      res.redirect('/connectors?instagram_error=callback_failed');
    }
  });

  app.post("/api/creator/instagram/sync/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const profile = await storage.getCreatorSocialProfile(id);
      if (!profile || profile.userId !== userId) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (profile.platform !== 'instagram' || !profile.instagramAccessToken || !profile.instagramAccountId) {
        return res.status(400).json({ error: 'Not an OAuth-connected Instagram profile' });
      }

      const analytics = await refreshInstagramAnalytics(
        profile.instagramAccessToken,
        profile.instagramAccountId
      );

      if (!analytics) {
        return res.status(500).json({ error: 'Failed to refresh analytics' });
      }

      const updated = await storage.updateCreatorSocialProfile(id, {
        followersCount: analytics.followersCount,
        followingCount: analytics.followingCount,
        mediaCount: analytics.mediaCount,
        lastSyncedAt: new Date(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error syncing Instagram profile:", error);
      res.status(500).json({ error: 'Failed to sync profile' });
    }
  });

  // LinkedIn OAuth routes for creator profiles
  app.get("/api/creator/linkedin/status", async (req, res) => {
    res.json({
      configured: isLinkedInOAuthConfigured(),
    });
  });

  app.get("/api/creator/linkedin/auth", isAuthenticated, async (req: any, res) => {
    try {
      if (!isLinkedInOAuthConfigured()) {
        return res.status(400).json({ error: 'LinkedIn OAuth not configured' });
      }

      const userId = req.user.claims.sub;
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/linkedin/callback`;

      const stateData = { userId, timestamp: Date.now() };
      const statePayload = Buffer.from(JSON.stringify(stateData)).toString('base64');
      const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'linkedin-oauth-secret')
        .update(statePayload)
        .digest('hex');
      const state = `${statePayload}.${signature}`;

      const authUrl = getLinkedInAuthUrl(redirectUri, state);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating LinkedIn auth URL:", error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  });

  app.get("/api/creator/linkedin/callback", async (req, res) => {
    try {
      const { code, state, error: authError, error_description } = req.query as Record<string, string>;

      if (authError) {
        console.error("LinkedIn auth error:", authError, error_description);
        return res.redirect('/connectors?linkedin_error=auth_denied');
      }

      if (!code || !state) {
        return res.redirect('/connectors?linkedin_error=missing_params');
      }

      let userId: string;
      try {
        const [statePayload, signature] = state.split('.');
        const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'linkedin-oauth-secret')
          .update(statePayload)
          .digest('hex');

        if (signature !== expectedSig) {
          console.error("LinkedIn OAuth state signature mismatch");
          return res.redirect('/connectors?linkedin_error=invalid_state');
        }

        const stateData = JSON.parse(Buffer.from(statePayload, 'base64').toString());
        
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
          return res.redirect('/connectors?linkedin_error=expired');
        }

        userId = stateData.userId;
      } catch (e) {
        console.error("LinkedIn OAuth state parsing error:", e);
        return res.redirect('/connectors?linkedin_error=invalid_state');
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/linkedin/callback`;

      const tokens = await linkedinExchangeCodeForToken(code, redirectUri);
      if (!tokens) {
        return res.redirect('/connectors?linkedin_error=token_failed');
      }

      const linkedInProfile = await getLinkedInProfile(tokens.accessToken);
      if (!linkedInProfile) {
        return res.redirect('/connectors?linkedin_error=profile_failed');
      }

      const existingProfile = await storage.getCreatorSocialProfileByPlatform(userId, 'linkedin');
      
      const linkedInProfileUrl = linkedInProfile.profileUrl || 
        (linkedInProfile.vanityName ? `https://linkedin.com/in/${linkedInProfile.vanityName}` : `https://linkedin.com/in/${linkedInProfile.id}`);

      if (existingProfile) {
        await storage.updateCreatorSocialProfile(existingProfile.id, {
          profileUrl: linkedInProfileUrl,
          displayName: `${linkedInProfile.firstName} ${linkedInProfile.lastName}`.trim(),
          linkedinAccessToken: tokens.accessToken,
          linkedinTokenExpiresAt: tokens.expiresAt,
          linkedinMemberId: linkedInProfile.id,
          lastSyncedAt: new Date(),
        });
      } else {
        await storage.createCreatorSocialProfile({
          userId,
          platform: 'linkedin',
          profileUrl: linkedInProfileUrl,
          displayName: `${linkedInProfile.firstName} ${linkedInProfile.lastName}`.trim(),
          linkedinAccessToken: tokens.accessToken,
          linkedinTokenExpiresAt: tokens.expiresAt,
          linkedinMemberId: linkedInProfile.id,
        });
      }

      res.redirect('/connectors?linkedin_connected=true');
    } catch (error) {
      console.error("LinkedIn callback error:", error);
      res.redirect('/connectors?linkedin_error=callback_failed');
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
    const socialProfiles = await storage.getCreatorSocialProfilesByUser(profile.userId);
    res.json({ profile, links, socialProfiles });
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

  // AI Profile Assistant endpoints
  app.post('/api/profile/ai/analyze-link', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      const analysis = analyzeLink(url);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing link:', error);
      res.status(500).json({ message: 'Failed to analyze link' });
    }
  });

  app.post('/api/profile/ai/generate-bio', isAuthenticated, async (req: any, res) => {
    try {
      const { podcastName, podcastTopic, hostName, existingBio } = req.body;
      const result = await generateBioAndHeadlines({ podcastName, podcastTopic, hostName, existingBio });
      res.json(result);
    } catch (error) {
      console.error('Error generating bio:', error);
      res.status(500).json({ message: 'Failed to generate bio' });
    }
  });

  app.post('/api/profile/ai/improve-bio', isAuthenticated, async (req: any, res) => {
    try {
      const { bio, hostName } = req.body;
      const improved = await improveBio(bio, hostName);
      res.json({ bio: improved });
    } catch (error) {
      console.error('Error improving bio:', error);
      res.status(500).json({ message: 'Failed to improve bio' });
    }
  });

  app.post('/api/profile/ai/suggest-links', isAuthenticated, async (req: any, res) => {
    try {
      const { podcastName, podcastTopic } = req.body;
      const suggestions = await suggestLinksForPodcast(podcastName, podcastTopic);
      res.json({ suggestions });
    } catch (error) {
      console.error('Error suggesting links:', error);
      res.status(500).json({ message: 'Failed to suggest links' });
    }
  });

  app.get('/api/profile/ai/quick-templates', isAuthenticated, async (req: any, res) => {
    res.json({ templates: quickLinkTemplates });
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

  // Sync episodes from all subscriptions
  app.post('/api/listener/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const result = await syncAllSubscriptionsForUser(userId);
      res.json(result);
    } catch (error) {
      console.error('Error syncing episodes:', error);
      res.status(500).json({ message: 'Failed to sync episodes' });
    }
  });

  // Run auto-briefings for pending episodes
  app.post('/api/listener/auto-briefings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const maxEpisodes = req.body.maxEpisodes || 3;
      const result = await processAutoBriefingsForUser(userId, maxEpisodes);
      res.json(result);
    } catch (error) {
      console.error('Error processing auto-briefings:', error);
      res.status(500).json({ message: 'Failed to process briefings' });
    }
  });

  // Get or create Spotify playlist
  app.get('/api/listener/spotify/playlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const playlist = await getPlaylistForUser(userId);
      res.json(playlist || { exists: false });
    } catch (error) {
      console.error('Error getting playlist:', error);
      res.status(500).json({ message: 'Failed to get playlist' });
    }
  });

  // Create Spotify playlist
  app.post('/api/listener/spotify/playlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(500).json({ message: 'Failed to create playlist' });
      }
      res.json(playlist);
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ message: 'Failed to create playlist' });
    }
  });

  // Add episode to Spotify playlist
  app.post('/api/listener/spotify/playlist/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { episodeId, podcastName, episodeTitle } = req.body;
      
      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(400).json({ message: 'No Spotify playlist found. Connect Spotify first.' });
      }

      const episodeUri = await searchSpotifyEpisode(userId, podcastName, episodeTitle);
      if (!episodeUri) {
        return res.status(404).json({ message: 'Episode not found on Spotify' });
      }

      const added = await addEpisodeToPlaylist(userId, playlist.id, episodeUri);
      if (!added) {
        return res.status(500).json({ message: 'Failed to add episode to playlist' });
      }

      res.json({ success: true, playlistUrl: playlist.externalUrl });
    } catch (error) {
      console.error('Error adding to playlist:', error);
      res.status(500).json({ message: 'Failed to add to playlist' });
    }
  });

  // Add all new episodes to Spotify playlist
  app.post('/api/listener/spotify/playlist/add-new', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(400).json({ message: 'No Spotify playlist found. Connect Spotify first.' });
      }

      // Get all new (unread) episodes with their subscription info
      const episodes = await storage.getSubscriptionEpisodesByUser(userId);
      const subscriptions = await storage.getPodcastSubscriptionsByUserId(userId);
      const subsMap = new Map(subscriptions.map(s => [s.id, s]));
      
      // Filter for new episodes (those that aren't read yet)
      const newEpisodes = episodes.filter(e => !e.isRead).slice(0, 20); // Limit to 20 to avoid rate limits
      
      let addedCount = 0;
      const errors: string[] = [];
      
      for (const episode of newEpisodes) {
        const subscription = subsMap.get(episode.subscriptionId);
        if (!subscription) continue;
        
        try {
          const episodeUri = await searchSpotifyEpisode(userId, subscription.title, episode.title);
          if (episodeUri) {
            const added = await addEpisodeToPlaylist(userId, playlist.id, episodeUri);
            if (added) addedCount++;
          }
        } catch (err) {
          errors.push(episode.title);
        }
      }

      res.json({ 
        success: true, 
        addedCount, 
        totalAttempted: newEpisodes.length,
        playlistUrl: playlist.externalUrl,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error adding new episodes to playlist:', error);
      res.status(500).json({ message: 'Failed to add episodes to playlist' });
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

  // ==================== BRAND DASHBOARD ROUTES (MODASH) ====================

  // Check if Modash is configured
  app.get('/api/brand/modash/status', isAuthenticated, async (req: any, res) => {
    res.json({ configured: isModashConfigured() });
  });

  // ==================== YOUTUBE INFLUENCER DISCOVERY (FREE API) ====================

  // Check if YouTube API is configured
  app.get('/api/brand/youtube/status', isAuthenticated, async (req: any, res) => {
    res.json({ configured: isYouTubeConfigured() });
  });

  // Search YouTube channels
  app.post('/api/brand/youtube/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query, maxResults, pageToken, order } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const results = await searchYouTubeChannels(query, {
        maxResults: maxResults || 10,
        pageToken,
        order: order || 'relevance',
      });

      // Transform to influencer-like format for consistent UI
      const influencers = results.channels.map(channel => ({
        userId: channel.channelId,
        username: channel.customUrl?.replace('@', '') || channel.title.toLowerCase().replace(/\s+/g, ''),
        fullName: channel.title,
        profilePicUrl: channel.thumbnailUrl,
        bio: channel.description?.slice(0, 200) || '',
        followerCount: channel.subscriberCount,
        followingCount: 0,
        engagementRate: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: Math.round(channel.viewCount / Math.max(channel.videoCount, 1)),
        videoCount: channel.videoCount,
        totalViews: channel.viewCount,
        location: channel.country,
        categories: [],
        platform: 'youtube',
        channelUrl: channel.customUrl 
          ? `https://youtube.com/${channel.customUrl}`
          : `https://youtube.com/channel/${channel.channelId}`,
      }));

      res.json({
        influencers,
        total: results.total,
        nextPageToken: results.nextPageToken,
        hasMore: !!results.nextPageToken,
      });
    } catch (error) {
      console.error('Error searching YouTube channels:', error);
      res.status(500).json({ message: 'Failed to search YouTube channels' });
    }
  });

  // Get YouTube channel details with videos
  app.get('/api/brand/youtube/channel/:channelId', isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      
      const [channel, videos] = await Promise.all([
        getChannelDetails(channelId),
        getChannelVideos(channelId, 10),
      ]);

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Calculate engagement from recent videos
      let avgViews = 0, avgLikes = 0, avgComments = 0;
      if (videos.length > 0) {
        avgViews = Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length);
        avgLikes = Math.round(videos.reduce((sum, v) => sum + v.likeCount, 0) / videos.length);
        avgComments = Math.round(videos.reduce((sum, v) => sum + v.commentCount, 0) / videos.length);
      }

      const engagementRate = calculateEngagementRate(
        channel.subscriberCount,
        avgViews,
        avgLikes,
        avgComments
      );

      res.json({
        ...channel,
        recentVideos: videos,
        avgViews,
        avgLikes,
        avgComments,
        engagementRate,
      });
    } catch (error) {
      console.error('Error getting YouTube channel:', error);
      res.status(500).json({ message: 'Failed to get channel details' });
    }
  });

  // ==================== INSTAGRAM INFLUENCER DISCOVERY (FREE API) ====================

  // Check if Instagram lookup is configured
  app.get('/api/brand/instagram/status', isAuthenticated, async (req: any, res) => {
    res.json({ configured: isInstagramLookupConfigured() });
  });

  // Lookup Instagram profile by username
  app.post('/api/brand/instagram/lookup', isAuthenticated, async (req: any, res) => {
    try {
      const usernameSchema = z.object({
        username: z.string().min(1, 'Username is required').max(30, 'Username too long'),
      });
      
      const parseResult = usernameSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid username', details: parseResult.error.issues });
      }
      
      const { username } = parseResult.data;

      if (!isInstagramLookupConfigured()) {
        return res.status(503).json({ 
          error: 'Instagram lookup not configured',
          message: 'Please configure META_ACCESS_TOKEN, META_APP_ID, and META_APP_SECRET'
        });
      }

      const result = await lookupInstagramProfile(username);
      
      if (!result.profile) {
        let statusCode: number;
        switch (result.error?.type) {
          case 'not_configured':
          case 'no_ig_account':
            statusCode = 503;
            break;
          case 'api_error':
            statusCode = 500;
            break;
          case 'profile_not_found':
          default:
            statusCode = 404;
            break;
        }
        return res.status(statusCode).json({ 
          error: result.error?.type || 'profile_not_found',
          message: result.error?.message || 'Could not find Instagram profile.'
        });
      }

      const profile = result.profile;

      res.json({
        influencers: [{
          userId: profile.userId,
          username: profile.username,
          fullName: profile.fullName,
          profilePicUrl: profile.profilePicUrl,
          bio: profile.bio,
          followerCount: profile.followerCount,
          followingCount: profile.followingCount,
          engagementRate: 0,
          avgLikes: 0,
          avgComments: 0,
          mediaCount: profile.mediaCount,
          location: null,
          categories: [],
          platform: 'instagram',
          profileUrl: `https://instagram.com/${profile.username}`,
        }],
        total: 1,
        hasMore: false,
      });
    } catch (error) {
      console.error('Error looking up Instagram profile:', error);
      res.status(500).json({ message: 'Failed to lookup Instagram profile' });
    }
  });

  // Instagram hashtag discovery status
  app.get('/api/brand/instagram/hashtag-status', isAuthenticated, async (req: any, res) => {
    try {
      const status = await checkHashtagServiceStatus();
      res.json(status);
    } catch (error) {
      console.error('Error checking hashtag service status:', error);
      res.status(500).json({ message: 'Failed to check hashtag service status' });
    }
  });

  // Instagram hashtag-based post discovery
  app.post('/api/brand/instagram/hashtag-search', isAuthenticated, async (req: any, res) => {
    try {
      const hashtagSchema = z.object({
        hashtag: z.string().min(1, 'Hashtag is required').max(50, 'Hashtag too long'),
      });
      
      const parseResult = hashtagSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid hashtag', details: parseResult.error.issues });
      }
      
      const { hashtag } = parseResult.data;
      const result = await discoverInfluencersByHashtag(hashtag);
      
      if (result.error) {
        let statusCode: number;
        switch (result.error.type) {
          case 'not_configured':
          case 'no_ig_account':
            statusCode = 503;
            break;
          case 'rate_limit':
            statusCode = 429;
            break;
          case 'api_error':
            statusCode = 500;
            break;
          case 'hashtag_not_found':
          default:
            statusCode = 404;
            break;
        }
        return res.status(statusCode).json({ 
          error: result.error.type,
          message: result.error.message,
          hashtag: result.hashtag
        });
      }

      res.json({
        hashtag: result.hashtag,
        hashtagId: result.hashtagId,
        posts: result.posts.map(post => ({
          postId: post.postId,
          caption: post.caption,
          mediaType: post.mediaType,
          likeCount: post.likeCount,
          commentsCount: post.commentsCount,
          engagement: post.engagement,
          timestamp: post.timestamp,
          permalink: post.permalink,
          platform: 'instagram',
        })),
        total: result.total,
      });
    } catch (error) {
      console.error('Error discovering posts by hashtag:', error);
      res.status(500).json({ message: 'Failed to discover posts by hashtag' });
    }
  });

  // LinkedIn Discovery Routes
  app.get('/api/brand/linkedin/status', isAuthenticated, async (req: any, res) => {
    res.json({
      configured: isLinkedInDiscoveryConfigured(),
    });
  });

  app.post('/api/brand/linkedin/lookup', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'LinkedIn URL is required' });
      }

      if (url.includes('/company/')) {
        const company = await extractLinkedInCompanyInfo(url);
        if (company) {
          return res.json({ type: 'company', data: company });
        }
      } else if (url.includes('/in/')) {
        const person = await extractLinkedInProfileInfo(url);
        if (person) {
          return res.json({ type: 'person', data: person });
        }
      }

      res.status(400).json({ error: 'Could not parse LinkedIn URL. Please provide a valid profile or company URL.' });
    } catch (error) {
      console.error('Error looking up LinkedIn profile:', error);
      res.status(500).json({ message: 'Failed to lookup LinkedIn profile' });
    }
  });

  app.get('/api/brand/linkedin/search-url', isAuthenticated, async (req: any, res) => {
    try {
      const { query, type = 'people' } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const searchUrl = getLinkedInSearchUrl(query, type as 'people' | 'companies');
      const suggestions = generateLinkedInSearchSuggestions(query);

      res.json({ searchUrl, suggestions });
    } catch (error) {
      console.error('Error generating LinkedIn search URL:', error);
      res.status(500).json({ message: 'Failed to generate search URL' });
    }
  });

  app.get('/api/brand/linkedin/hashtag-url', isAuthenticated, async (req: any, res) => {
    try {
      const { hashtag } = req.query;
      
      if (!hashtag || typeof hashtag !== 'string') {
        return res.status(400).json({ error: 'Hashtag is required' });
      }

      const hashtagUrl = getLinkedInHashtagUrl(hashtag);
      res.json({ hashtagUrl, hashtag: hashtag.replace(/^#/, '') });
    } catch (error) {
      console.error('Error generating LinkedIn hashtag URL:', error);
      res.status(500).json({ message: 'Failed to generate hashtag URL' });
    }
  });

  // Search influencers via Modash
  app.post('/api/brand/influencers/search', isAuthenticated, async (req: any, res) => {
    try {
      const parseResult = modashSearchSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid search parameters', details: parseResult.error.issues });
      }
      
      const { platform, minFollowers, maxFollowers, minEngagement, maxEngagement, location, keywords, hashtags, page } = parseResult.data;
      
      const results = await searchInfluencers({
        platform,
        minFollowers,
        maxFollowers,
        minEngagement,
        maxEngagement,
        location,
        keywords,
        hashtags,
      }, page);
      
      res.json(results);
    } catch (error) {
      console.error('Error searching influencers:', error);
      res.status(500).json({ message: 'Failed to search influencers' });
    }
  });

  // Get influencer profile
  app.get('/api/brand/influencers/profile/:platform/:username', isAuthenticated, async (req: any, res) => {
    try {
      const { platform, username } = req.params;
      const profile = await getInfluencerProfile(platform, username);
      if (!profile) {
        return res.status(404).json({ message: 'Influencer not found' });
      }
      res.json(profile);
    } catch (error) {
      console.error('Error getting influencer profile:', error);
      res.status(500).json({ message: 'Failed to get influencer profile' });
    }
  });

  // Get saved influencers
  app.get('/api/brand/saved-influencers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const influencers = await storage.getSavedInfluencersByUser(userId);
      res.json(influencers);
    } catch (error) {
      console.error('Error getting saved influencers:', error);
      res.status(500).json({ message: 'Failed to get saved influencers' });
    }
  });

  // Save an influencer
  app.post('/api/brand/saved-influencers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const data = insertSavedInfluencerSchema.parse({ ...req.body, userId });
      const influencer = await storage.createSavedInfluencer(data);
      res.status(201).json(influencer);
    } catch (error) {
      console.error('Error saving influencer:', error);
      res.status(500).json({ message: 'Failed to save influencer' });
    }
  });

  // Update saved influencer
  app.patch('/api/brand/saved-influencers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const influencer = await storage.updateSavedInfluencer(id, req.body);
      res.json(influencer);
    } catch (error) {
      console.error('Error updating saved influencer:', error);
      res.status(500).json({ message: 'Failed to update influencer' });
    }
  });

  // Delete saved influencer
  app.delete('/api/brand/saved-influencers/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSavedInfluencer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting saved influencer:', error);
      res.status(500).json({ message: 'Failed to delete influencer' });
    }
  });

  // Get hashtag monitors
  app.get('/api/brand/hashtag-monitors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const monitors = await storage.getHashtagMonitorsByUser(userId);
      res.json(monitors);
    } catch (error) {
      console.error('Error getting hashtag monitors:', error);
      res.status(500).json({ message: 'Failed to get monitors' });
    }
  });

  // Create hashtag monitor
  app.post('/api/brand/hashtag-monitors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const data = insertHashtagMonitorSchema.parse({ ...req.body, userId });
      const monitor = await storage.createHashtagMonitor(data);
      res.status(201).json(monitor);
    } catch (error) {
      console.error('Error creating hashtag monitor:', error);
      res.status(500).json({ message: 'Failed to create monitor' });
    }
  });

  // Delete hashtag monitor
  app.delete('/api/brand/hashtag-monitors/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteHashtagMonitor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting hashtag monitor:', error);
      res.status(500).json({ message: 'Failed to delete monitor' });
    }
  });

  // ============ ADMIN ROUTES ============

  // Check if current user is admin
  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await authStorage.getUser(userId);
      res.json({ 
        isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
        isSuperAdmin: user?.role === 'superadmin',
        role: user?.role || 'user'
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ message: 'Failed to check admin status' });
    }
  });

  // Get all users (admin only)
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await authStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: 'Failed to get users' });
    }
  });

  // Update user role (superadmin only)
  app.patch('/api/admin/users/:id/role', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!['user', 'admin', 'superadmin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      const user = await authStorage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // Update user status (admin only - suspend/activate)
  app.patch('/api/admin/users/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { isActive } = req.body;
      if (!['true', 'false'].includes(isActive)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      const user = await authStorage.updateUserStatus(req.params.id, isActive);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Delete user (superadmin only)
  app.delete('/api/admin/users/:id', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const requestingUserId = req.user?.claims?.sub;
      if (req.params.id === requestingUserId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      await authStorage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Get platform stats (admin only)
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await authStorage.getAllUsers();
      const identityAssets = await storage.getAllIdentityAssets();
      const subscriptions = await storage.getAllPodcastSubscriptions();
      
      res.json({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive === 'true').length,
        adminCount: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
        totalIdentityAssets: identityAssets.length,
        verifiedIdentities: identityAssets.filter(a => a.certStatus === 'minted').length,
        totalSubscriptions: subscriptions.length
      });
    } catch (error) {
      console.error('Error getting platform stats:', error);
      res.status(500).json({ message: 'Failed to get stats' });
    }
  });

  // ==================== EMAIL HUB ROUTES ====================

  // Get all email contacts
  app.get('/api/email/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contacts = await storage.getEmailContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error('Error getting contacts:', error);
      res.status(500).json({ message: 'Failed to get contacts' });
    }
  });

  // Add email contact
  app.post('/api/email/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contact = await storage.createEmailContact({ ...req.body, userId });
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ message: 'Failed to create contact' });
    }
  });

  // Update email contact
  app.patch('/api/email/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contact = await storage.updateEmailContact(req.params.id, userId, req.body);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ message: 'Failed to update contact' });
    }
  });

  // Delete email contact
  app.delete('/api/email/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.deleteEmailContact(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Get email templates
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ message: 'Failed to get templates' });
    }
  });

  // Create email template
  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const template = await storage.createEmailTemplate({ ...req.body, userId });
      res.json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Failed to create template' });
    }
  });

  // Delete email template
  app.delete('/api/email/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.deleteEmailTemplate(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Failed to delete template' });
    }
  });

  // Get email campaigns
  app.get('/api/email/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const campaigns = await storage.getEmailCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error('Error getting campaigns:', error);
      res.status(500).json({ message: 'Failed to get campaigns' });
    }
  });

  // Create email campaign
  app.post('/api/email/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const campaign = await storage.createEmailCampaign({ ...req.body, userId });
      res.json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: 'Failed to create campaign' });
    }
  });

  // Update email campaign
  app.patch('/api/email/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const campaign = await storage.updateEmailCampaign(req.params.id, userId, req.body);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ message: 'Failed to update campaign' });
    }
  });

  // Send email campaign
  app.post('/api/email/campaigns/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { recipientIds } = req.body;
      const result = await sendEmailCampaign(req.params.id, userId, recipientIds);
      res.json(result);
    } catch (error) {
      console.error('Error sending campaign:', error);
      res.status(500).json({ message: 'Failed to send campaign' });
    }
  });

  // Generate email with AI
  app.post('/api/email/generate', isAuthenticated, async (req: any, res) => {
    try {
      const email = await generateEmailWithAI(req.body);
      res.json(email);
    } catch (error) {
      console.error('Error generating email:', error);
      res.status(500).json({ message: 'Failed to generate email' });
    }
  });

  // Improve email with AI
  app.post('/api/email/improve', isAuthenticated, async (req: any, res) => {
    try {
      const { subject, body, instruction } = req.body;
      const improved = await improveEmailWithAI(subject, body, instruction);
      res.json(improved);
    } catch (error) {
      console.error('Error improving email:', error);
      res.status(500).json({ message: 'Failed to improve email' });
    }
  });

  // Generate subject lines
  app.post('/api/email/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const { body, count } = req.body;
      const subjects = await generateSubjectLines(body, count || 5);
      res.json({ subjects });
    } catch (error) {
      console.error('Error generating subjects:', error);
      res.status(500).json({ message: 'Failed to generate subjects' });
    }
  });

  // Check email service status
  app.get('/api/email/status', isAuthenticated, async (req: any, res) => {
    try {
      const configured = await isEmailConfigured();
      res.json({ configured });
    } catch (error) {
      res.json({ configured: false });
    }
  });

  return httpServer;
}
