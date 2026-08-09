import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin, isSuperAdmin, authStorage } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { createUploadUrl, publicUrlForKey, isSupabaseStorageConfigured } from "./services/supabaseStorageService";
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
import { generatePodcastFeedXml } from "./services/feedService";
import { insertEpisodeSchema } from "@shared/schema";
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
import { insertSavedInfluencerSchema, insertHashtagMonitorSchema, modashSearchSchema, insertConnectedSocialAccountSchema, clientSavedCreators, adminDevDocuments, teamInvitations } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { generateEmailWithAI, improveEmailWithAI, generateSubjectLines } from "./services/aiEmailService";
import { sendEmail, isEmailConfigured } from "./services/emailService";
import { analyzeLink, generateBioAndHeadlines, suggestLinksForPodcast, improveBio, quickLinkTemplates } from "./services/aiProfileService";
import { registerConnectorRoutes } from "./connectorRoutes";

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

/**
 * Public base URL for hosted feeds and media enclosures.
 * Set PUBLIC_BASE_URL in production (e.g. https://podlogix.io); falls back to the request host.
 */
function getPublicBaseUrl(req: any): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
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

  // ── User profile self-service routes ──────────────────────────────────────
  // PATCH /api/user/profile — update own name or profileImageUrl
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { firstName, lastName, profileImageUrl, phone, zipCode, bio } = req.body ?? {};
      const updated = await authStorage.updateUserProfile(userId, {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(zipCode !== undefined ? { zipCode } : {}),
        ...(bio !== undefined ? { bio } : {}),
      });
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating user profile:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // POST /api/user/change-password — change own password (requires current password)
  app.post("/api/user/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { currentPassword, newPassword } = req.body ?? {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      const user = await authStorage.getUser(userId);
      if (!user?.passwordHash) {
        return res.status(400).json({ message: "No password set on this account" });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await authStorage.setPassword(userId, newHash);
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Error changing password:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Register AI chat routes
  registerChatRoutes(app);

  // Register connector routes (Buzzsprout, etc.)
  registerConnectorRoutes(app);
  
  // Register object storage routes for file uploads
  // ============ MEDIA UPLOADS (Supabase Storage) ============
  // Same contract the old Replit object storage exposed:
  // returns { uploadURL, objectPath } — client PUTs the file to uploadURL
  // and stores objectPath (now a public Supabase URL) in the database.
  app.post("/api/uploads/request-url", isAuthenticated, async (req: any, res) => {
    try {
      if (!isSupabaseStorageConfigured()) {
        return res.status(503).json({
          error: "File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        });
      }
      const { name, size, contentType } = req.body ?? {};
      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }
      const { uploadURL, objectPath } = await createUploadUrl(String(name));
      res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate upload URL";
      console.error("Error generating upload URL:", msg);
      res.status(500).json({ error: msg });
    }
  });

  // Legacy compatibility: /objects/<key> paths redirect to the public Supabase URL.
  app.get(/^\/objects\/(.+)$/, async (req, res) => {
    try {
      if (!isSupabaseStorageConfigured()) {
        return res.status(503).json({ error: "File storage is not configured" });
      }
      const objectKey = (req.params as any)[0] as string;
      return res.redirect(302, publicUrlForKey(objectKey));
    } catch (error) {
      console.error("Error resolving object:", error);
      return res.status(404).json({ error: "Object not found" });
    }
  });

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
      const userEmail = (req as any).dbUser?.email;
      
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
      const userEmail = (req as any).dbUser?.email;

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
      const userEmail = (req as any).dbUser?.email;

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
      const userId = req.session.userId!;
      const dbUser = (req as any).dbUser;
      const userName = `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim() || dbUser?.email || 'User';
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
      const userId = req.session.userId!;
      
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      
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
      const userId = req.session.userId!;
      const profiles = await storage.getCreatorSocialProfilesByUser(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching social profiles:", error);
      res.status(500).json({ error: 'Failed to fetch social profiles' });
    }
  });

  app.post("/api/creator/social-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      
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
      const userId = req.session.userId!;
      
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
      console.log("[Instagram Auth] META_APP_ID from env:", process.env.META_APP_ID);
      if (!isInstagramOAuthConfigured()) {
        return res.status(400).json({ error: 'Instagram OAuth not configured' });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/instagram/callback`;
      
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;

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

      const userId = req.session.userId!;
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

  // Facebook OAuth routes for creator profiles
  app.get("/api/creator/facebook/status", async (req, res) => {
    const { isFacebookOAuthConfigured } = await import('./services/facebookOAuth');
    res.json({
      configured: isFacebookOAuthConfigured(),
    });
  });

  app.get("/api/creator/facebook/auth", isAuthenticated, async (req: any, res) => {
    try {
      const { isFacebookOAuthConfigured, getFacebookAuthUrl } = await import('./services/facebookOAuth');
      
      if (!isFacebookOAuthConfigured()) {
        return res.status(400).json({ error: 'Facebook OAuth not configured' });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/facebook/callback`;
      
      const userId = req.session.userId!;
      const timestamp = Date.now();
      const stateData = JSON.stringify({ userId, timestamp });
      const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'facebook-oauth-secret')
        .update(stateData)
        .digest('hex');
      const state = Buffer.from(JSON.stringify({ data: stateData, sig: signature })).toString('base64');
      
      const authUrl = getFacebookAuthUrl(redirectUri, state);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating Facebook auth URL:", error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  });

  app.get("/api/creator/facebook/callback", async (req, res) => {
    try {
      const { code, state, error: authError, error_description } = req.query;

      if (authError) {
        console.error("Facebook auth error:", authError, error_description);
        return res.redirect('/connectors?facebook_error=auth_denied');
      }

      if (!code || !state) {
        return res.redirect('/connectors?facebook_error=missing_params');
      }

      let userId: string;
      try {
        const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString());
        const { data: stateData, sig } = stateObj;
        
        const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'facebook-oauth-secret')
          .update(stateData)
          .digest('hex');
        
        if (sig !== expectedSig) {
          console.error("Facebook OAuth state signature mismatch");
          return res.redirect('/connectors?facebook_error=invalid_state');
        }
        
        const parsed = JSON.parse(stateData);
        userId = parsed.userId;
        
        const stateAge = Date.now() - parsed.timestamp;
        if (stateAge > 10 * 60 * 1000) {
          return res.redirect('/connectors?facebook_error=state_expired');
        }
      } catch (e) {
        console.error("Facebook OAuth state parsing error:", e);
        return res.redirect('/connectors?facebook_error=invalid_state');
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirectUri = `${protocol}://${host}/api/creator/facebook/callback`;

      const { exchangeCodeForToken, getLongLivedToken, getUserPages } = await import('./services/facebookOAuth');

      const tokens = await exchangeCodeForToken(code as string, redirectUri);
      if (!tokens) {
        return res.redirect('/connectors?facebook_error=token_exchange_failed');
      }

      const longLivedTokens = await getLongLivedToken(tokens.accessToken);
      const accessToken = longLivedTokens?.accessToken || tokens.accessToken;
      const expiresAt = longLivedTokens?.expiresAt || tokens.expiresAt;

      const pages = await getUserPages(accessToken);
      if (!pages || pages.length === 0) {
        return res.redirect('/connectors?facebook_error=no_pages');
      }

      // Use the first page for now
      const page = pages[0];

      const existingProfiles = await storage.getCreatorSocialProfilesByUser(userId);
      const existingFacebook = existingProfiles.find(p => p.platform === 'facebook');
      
      if (existingFacebook) {
        await storage.updateCreatorSocialProfile(existingFacebook.id, {
          username: page.name,
          displayName: page.name,
          profilePictureUrl: page.pictureUrl,
          facebookPageId: page.id,
          facebookAccessToken: page.accessToken,
          facebookTokenExpiresAt: expiresAt,
          facebookPageName: page.name,
          facebookFansCount: page.fansCount,
          verified: true,
          lastSyncedAt: new Date(),
        });
      } else {
        await storage.createCreatorSocialProfile({
          userId,
          platform: 'facebook',
          profileUrl: `https://facebook.com/${page.id}`,
          username: page.name,
          displayName: page.name,
          profilePictureUrl: page.pictureUrl,
          facebookPageId: page.id,
          facebookAccessToken: page.accessToken,
          facebookTokenExpiresAt: expiresAt,
          facebookPageName: page.name,
          facebookFansCount: page.fansCount,
          verified: true,
          lastSyncedAt: new Date(),
        });
      }

      res.redirect('/connectors?facebook_connected=true');
    } catch (error) {
      console.error("Facebook callback error:", error);
      res.redirect('/connectors?facebook_error=callback_failed');
    }
  });

  // Dashboard endpoint (protected)
  app.get(api.dashboard.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.session.userId!;
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
    const userId = req.session.userId!;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
  });

  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
    const userId = req.session.userId!;
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
    const userId = req.session.userId!;
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.json([]);
    const links = await storage.getProfileLinks(profile.id);
    res.json(links);
  });

  app.post(api.profileLinks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
    const userId = req.session.userId!;
    const podcastsList = await storage.getPodcastsByUserId(userId);
    res.json(podcastsList);
  });

  app.post(api.podcasts.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      // Real validation: fetch and parse the feed
      try {
        const parsed = await parseFeed(feedUrl);
        res.json({ valid: true, episodeCount: parsed.episodes.length, title: parsed.title });
      } catch {
        res.json({ valid: false, episodeCount: 0 });
      }
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
    if (podcast.userId !== req.session.userId) {
      return res.status(403).json({ message: 'Not your podcast' });
    }
    // Real Podlogix-hosted RSS URL, served by GET /feeds/:podcastId/feed.xml below
    const baseUrl = getPublicBaseUrl(req);
    const feedUrl = `${baseUrl}/feeds/${podcastId}/feed.xml`;
    const existing = (await storage.getRssFeedsByPodcast(podcastId)).find(f => f.sourceType === 'podlogix');
    if (existing) {
      const updated = await storage.updateRssFeed(existing.id, { feedUrl, status: 'active' });
      return res.status(201).json(updated);
    }
    const feed = await storage.createRssFeed({ podcastId, feedUrl, sourceType: 'podlogix', status: 'active' });
    res.status(201).json(feed);
  });

  // ============ HOSTED PODCAST FEED (public, Apple-spec RSS 2.0) ============
  app.get('/feeds/:podcastId/feed.xml', async (req, res) => {
    const podcast = await storage.getPodcast(req.params.podcastId);
    if (!podcast) {
      return res.status(404).type('text/plain').send('Feed not found');
    }
    const publishedEpisodes = await storage.getPublishedEpisodesByPodcast(podcast.id);
    const xml = generatePodcastFeedXml(podcast, publishedEpisodes, getPublicBaseUrl(req));
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300'); // 5 min — podcast apps poll feeds
    res.send(xml);
  });

  // ============ CREATOR EPISODES (hosted) ============
  const requirePodcastOwnership = async (req: any, res: any): Promise<any | null> => {
    const podcast = await storage.getPodcast(req.params.podcastId);
    if (!podcast) {
      res.status(404).json({ message: 'Podcast not found' });
      return null;
    }
    if (podcast.userId !== req.session.userId) {
      res.status(403).json({ message: 'Not your podcast' });
      return null;
    }
    return podcast;
  };

  app.get('/api/podcasts/:podcastId/episodes', isAuthenticated, async (req: any, res) => {
    const podcast = await requirePodcastOwnership(req, res);
    if (!podcast) return;
    const list = await storage.getEpisodesByPodcast(podcast.id);
    res.json(list);
  });

  app.post('/api/podcasts/:podcastId/episodes', isAuthenticated, async (req: any, res) => {
    try {
      const podcast = await requirePodcastOwnership(req, res);
      if (!podcast) return;
      const input = insertEpisodeSchema.parse({ ...req.body, podcastId: podcast.id });
      const episode = await storage.createEpisode(input);
      res.status(201).json(episode);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  const requireEpisodeOwnership = async (req: any, res: any) => {
    const episode = await storage.getEpisode(req.params.id);
    if (!episode) {
      res.status(404).json({ message: 'Episode not found' });
      return null;
    }
    const podcast = await storage.getPodcast(episode.podcastId);
    if (!podcast || podcast.userId !== req.session.userId) {
      res.status(403).json({ message: 'Not your episode' });
      return null;
    }
    return episode;
  };

  app.get('/api/episodes/:id', isAuthenticated, async (req: any, res) => {
    const episode = await requireEpisodeOwnership(req, res);
    if (!episode) return;
    res.json(episode);
  });

  app.patch('/api/episodes/:id', isAuthenticated, async (req: any, res) => {
    const episode = await requireEpisodeOwnership(req, res);
    if (!episode) return;
    // Never allow changing ownership or identity via PATCH
    const { id, podcastId, createdAt, updatedAt, ...updates } = req.body ?? {};
    const updated = await storage.updateEpisode(episode.id, updates);
    res.json(updated);
  });

  app.delete('/api/episodes/:id', isAuthenticated, async (req: any, res) => {
    const episode = await requireEpisodeOwnership(req, res);
    if (!episode) return;
    await storage.deleteEpisode(episode.id);
    res.status(204).end();
  });

  app.post('/api/episodes/:id/publish', isAuthenticated, async (req: any, res) => {
    const episode = await requireEpisodeOwnership(req, res);
    if (!episode) return;
    if (!episode.audioUrl) {
      return res.status(400).json({ message: 'Episode needs an audio file before it can be published' });
    }
    const updated = await storage.updateEpisode(episode.id, {
      status: 'published',
      publishedAt: episode.publishedAt ?? new Date(),
      guid: episode.guid ?? episode.id,
    });
    res.json(updated);
  });

  app.post('/api/episodes/:id/unpublish', isAuthenticated, async (req: any, res) => {
    const episode = await requireEpisodeOwnership(req, res);
    if (!episode) return;
    const updated = await storage.updateEpisode(episode.id, { status: 'draft' });
    res.json(updated);
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
      const userId = req.session.userId!;
      const redirectUri = `${process.env.PUBLIC_BASE_URL || 'https://podlogix.io'}/api/listener/spotify/callback`;
      
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

      const authenticatedUserId = req.session.userId!;
      if (!authenticatedUserId) {
        return res.redirect('/login?return_to=/listener&spotify_error=not_authenticated');
      }

      if (state !== authenticatedUserId) {
        console.error('Spotify OAuth state mismatch - potential CSRF');
        return res.redirect('/listener?spotify_error=auth_failed');
      }

      const redirectUri = `${process.env.PUBLIC_BASE_URL || 'https://podlogix.io'}/api/listener/spotify/callback`;

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
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Spotify callback error:', msg);
      const encoded = encodeURIComponent(msg.slice(0, 120));
      res.redirect(`/listener?spotify_error=auth_failed&spotify_error_detail=${encoded}`);
    }
  });

  // Spotify integration status (per-user)
  app.get('/api/listener/spotify/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const playlist = await createOrGetBriefingsPlaylist(userId);
      res.json(playlist);
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Error creating playlist:', msg);
      res.status(500).json({ message: msg });
    }
  });

  // Add episode to Spotify playlist
  app.post('/api/listener/spotify/playlist/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { episodeId, podcastName, episodeTitle } = req.body;

      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(500).json({ message: 'Could not get or create your Podlogix Recommendations playlist — try clicking "Create Playlist" first.' });
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
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Error adding to playlist:', msg);
      res.status(500).json({ message: msg });
    }
  });

  // Add all new episodes to Spotify playlist
  app.post('/api/listener/spotify/playlist/add-new', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;

      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(500).json({ message: 'Could not get or create your Podlogix Recommendations playlist — try clicking "Create Playlist" first.' });
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
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Error adding new episodes to playlist:', msg);
      res.status(500).json({ message: msg });
    }
  });

  // Sync smart playlist: add the latest episode from each marked podcast
  app.post('/api/listener/spotify/playlist/sync-smart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { subscriptionIds } = req.body;

      if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
        return res.status(400).json({ message: 'No podcasts selected — mark at least one podcast for the smart playlist' });
      }

      const playlist = await createOrGetBriefingsPlaylist(userId);
      if (!playlist) {
        return res.status(500).json({ message: 'Could not get or create your Podlogix Recommendations playlist — try clicking "Create Playlist" first, then sync again.' });
      }

      const allEpisodes = await storage.getSubscriptionEpisodesByUser(userId);
      const subs = await storage.getPodcastSubscriptionsByUserId(userId);
      const subsMap = new Map(subs.map(s => [s.id, s]));

      let addedCount = 0;

      for (const subId of subscriptionIds) {
        const subscription = subsMap.get(subId);
        if (!subscription) continue;

        // Get the most recent episode for this subscription
        const subEpisodes = allEpisodes
          .filter(e => e.subscriptionId === subId)
          .sort((a, b) => {
            const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return db - da;
          });

        const latestEpisode = subEpisodes[0];
        if (!latestEpisode) continue;

        try {
          const episodeUri = await searchSpotifyEpisode(userId, subscription.title, latestEpisode.title);
          if (episodeUri) {
            const added = await addEpisodeToPlaylist(userId, playlist.id, episodeUri);
            if (added) addedCount++;
          }
        } catch (err) {
          console.error(`Error adding episode for ${subscription.title}:`, err);
        }
      }

      res.json({ success: true, addedCount, playlistUrl: playlist.externalUrl || null });
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Error syncing smart playlist:', msg);
      res.status(500).json({ message: msg });
    }
  });

  // Podcast-aware AI chat for the listener dashboard
  app.post('/api/listener/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, context, history = [] } = req.body;
      if (!message) return res.status(400).json({ message: 'No message provided' });

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: 'AI chat is not configured — OPENAI_API_KEY missing' });
      }

      const systemPrompt = `You are Podlogix AI, a helpful assistant for podcast listeners. ${context || ''}
Help users discover insights from their podcasts, summarize topics, suggest new shows, and answer questions about their listening habits.
Keep responses concise and conversational (2-4 sentences max unless more detail is needed).`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ];

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.text();
        console.error('OpenAI error:', err);
        return res.status(502).json({ message: 'AI service error, please try again' });
      }

      const data = await aiRes.json() as any;
      const response = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      res.json({ response });
    } catch (error: any) {
      console.error('Listener chat error:', error);
      res.status(500).json({ message: 'Something went wrong' });
    }
  });

  // Get user's podcast subscriptions
  app.get('/api/listener/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const episode = await storage.getSubscriptionEpisode(req.params.id);
      
      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      
      if (!episode.audioUrl) {
        return res.status(400).json({ message: 'Episode has no audio URL' });
      }
      
      // Run transcription synchronously — Vercel kills background tasks after response is sent
      await transcribeEpisode(req.params.id, userId);
      const updated = await storage.getSubscriptionEpisode(req.params.id);
      res.json({ message: 'Transcription complete', status: updated?.transcriptStatus || 'complete' });
    } catch (error: any) {
      console.error('Error transcribing episode:', error);
      res.status(500).json({ message: error?.message || 'Failed to transcribe episode' });
    }
  });

  // Generate briefing for episode
  app.post('/api/listener/episodes/:id/briefing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const episode = await storage.getSubscriptionEpisode(req.params.id);

      if (!episode || episode.userId !== userId) {
        return res.status(404).json({ message: 'Episode not found' });
      }

      if (!episode.transcript) {
        return res.status(400).json({ message: 'Episode must be transcribed first' });
      }

      // Run briefing synchronously — Vercel kills background tasks after response is sent
      await processEpisodeBriefing(req.params.id, userId);
      const updated = await storage.getSubscriptionEpisode(req.params.id);
      res.json({ message: 'Briefing complete', status: updated?.briefingStatus || 'complete' });
    } catch (error: any) {
      console.error('Error generating briefing:', error);
      res.status(500).json({ message: error?.message || 'Failed to generate briefing' });
    }
  });

  // Get briefing for specific episode
  app.get('/api/listener/episodes/:id/briefing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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

  // Search YouTube channels (admin only)
  app.post('/api/brand/youtube/search', isAuthenticated, isAdmin, async (req: any, res) => {
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

  // Instagram hashtag-based post discovery (admin only)
  app.post('/api/brand/instagram/hashtag-search', isAuthenticated, isAdmin, async (req: any, res) => {
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const requestingUserId = req.session.userId!;
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

  // ============ ADMIN CREATOR LIST ROUTES ============

  // Get all creators in admin list
  app.get('/api/admin/creators', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const creators = await storage.getAdminCreators();
      res.json(creators);
    } catch (error) {
      console.error('Error getting admin creators:', error);
      res.status(500).json({ message: 'Failed to get creators' });
    }
  });

  // Add creator to admin list
  app.post('/api/admin/creators', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const creator = await storage.createAdminCreator({ 
        ...req.body, 
        addedByUserId: userId 
      });
      res.json(creator);
    } catch (error) {
      console.error('Error adding creator:', error);
      res.status(500).json({ message: 'Failed to add creator' });
    }
  });

  // Get single creator details
  app.get('/api/admin/creators/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const creator = await storage.getAdminCreator(req.params.id);
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }
      res.json(creator);
    } catch (error) {
      console.error('Error getting creator:', error);
      res.status(500).json({ message: 'Failed to get creator' });
    }
  });

  // Update creator (rate sheet, notes, status, etc.)
  app.patch('/api/admin/creators/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const creator = await storage.updateAdminCreator(req.params.id, req.body);
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }
      res.json(creator);
    } catch (error) {
      console.error('Error updating creator:', error);
      res.status(500).json({ message: 'Failed to update creator' });
    }
  });

  // Delete creator from admin list
  app.delete('/api/admin/creators/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteAdminCreator(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting creator:', error);
      res.status(500).json({ message: 'Failed to delete creator' });
    }
  });

  // ==================== ADMIN DEV DOCUMENTS ====================

  app.get('/api/admin/dev-documents', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const docs = await db.select().from(adminDevDocuments).orderBy(desc(adminDevDocuments.updatedAt));
      res.json(docs);
    } catch (error) {
      console.error('Error fetching dev documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.post('/api/admin/dev-documents', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        category: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
      }
      const [doc] = await db.insert(adminDevDocuments).values({
        ...parsed.data,
        createdByUserId: userId,
      }).returning();
      res.json(doc);
    } catch (error) {
      console.error('Error creating dev document:', error);
      res.status(500).json({ message: 'Failed to create document' });
    }
  });

  app.patch('/api/admin/dev-documents/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        category: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
      }
      const [doc] = await db.update(adminDevDocuments)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(adminDevDocuments.id, req.params.id))
        .returning();
      if (!doc) return res.status(404).json({ message: 'Document not found' });
      res.json(doc);
    } catch (error) {
      console.error('Error updating dev document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.delete('/api/admin/dev-documents/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await db.delete(adminDevDocuments).where(eq(adminDevDocuments.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting dev document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // ==================== TEAM INVITATIONS ====================

  app.get('/api/admin/team-invitations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const invitations = await db.select().from(teamInvitations).orderBy(desc(teamInvitations.createdAt));
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      res.status(500).json({ message: 'Failed to fetch invitations' });
    }
  });

  app.post('/api/admin/team-invitations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'superadmin']),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
      }

      const existing = await db.select().from(teamInvitations).where(
        and(
          eq(teamInvitations.email, parsed.data.email),
          eq(teamInvitations.status, 'pending')
        )
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'A pending invitation already exists for this email' });
      }

      const user = await authStorage.getUser(userId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invitation] = await db.insert(teamInvitations).values({
        email: parsed.data.email,
        role: parsed.data.role,
        invitedByUserId: userId,
        invitedByName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Admin',
        status: 'pending',
        expiresAt,
      }).returning();

      res.json(invitation);
    } catch (error) {
      console.error('Error creating team invitation:', error);
      res.status(500).json({ message: 'Failed to create invitation' });
    }
  });

  app.delete('/api/admin/team-invitations/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await db.delete(teamInvitations).where(eq(teamInvitations.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking invitation:', error);
      res.status(500).json({ message: 'Failed to revoke invitation' });
    }
  });

  app.post('/api/admin/team-invitations/:id/resend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const [invitation] = await db.update(teamInvitations)
        .set({ expiresAt, status: 'pending' })
        .where(eq(teamInvitations.id, req.params.id))
        .returning();
      if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
      res.json(invitation);
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ message: 'Failed to resend invitation' });
    }
  });

  // Auto-accept invitation when user logs in (checked on admin check)
  app.post('/api/admin/accept-invitation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const user = await authStorage.getUser(userId);
      if (!user?.email) return res.status(400).json({ message: 'User email not found' });

      const [invitation] = await db.select().from(teamInvitations).where(
        and(
          eq(teamInvitations.email, user.email),
          eq(teamInvitations.status, 'pending')
        )
      );

      if (!invitation) return res.json({ accepted: false, message: 'No pending invitation' });

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        await db.update(teamInvitations)
          .set({ status: 'expired' })
          .where(eq(teamInvitations.id, invitation.id));
        return res.json({ accepted: false, message: 'Invitation has expired' });
      }

      await authStorage.updateUserRole(user.id, invitation.role);
      await db.update(teamInvitations)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(teamInvitations.id, invitation.id));

      res.json({ accepted: true, role: invitation.role });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Failed to accept invitation' });
    }
  });

  // ==================== INFLUENCERS.CLUB API ROUTES ====================

  const getInfluencersClubApiKey = () => process.env.INFLUENCERS_CLUB_API_KEY;

  // Influencers.club Discovery API
  app.post('/api/influencers-club/discover', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Influencers.club API key not configured' });
      }

      const { platform, filters, prompt, limit = 20 } = req.body;

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/discovery/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform || 'instagram',
          prompt: prompt || '',
          filters: filters || {},
          limit: Math.min(limit, 50),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Influencers.club API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Discovery API request failed',
          details: errorText 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error with Influencers.club discovery:', error);
      res.status(500).json({ error: 'Failed to search creators' });
    }
  });

  // Influencers.club Enrich by Handle
  app.post('/api/influencers-club/enrich-handle', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Influencers.club API key not configured' });
      }

      const { handle, platform } = req.body;
      if (!handle || !platform) {
        return res.status(400).json({ error: 'Handle and platform are required' });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/enrichment/handle/full/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handle,
          platform,
          email_required: 'preferred',
          include_lookalikes: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Influencers.club enrich error:', errorText);
        return res.status(response.status).json({ 
          error: 'Enrichment failed',
          details: errorText 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error enriching handle:', error);
      res.status(500).json({ error: 'Failed to enrich creator' });
    }
  });

  // Check Influencers.club API status and credits
  app.get('/api/influencers-club/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.json({ configured: false });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/account/credits/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return res.json({ configured: true, valid: false });
      }

      const data = await response.json();
      res.json({ 
        configured: true, 
        valid: true,
        credits: data.credits_remaining || data.credits || 0,
        usage: data
      });
    } catch (error) {
      console.error('Error checking Influencers.club status:', error);
      res.json({ configured: true, valid: false });
    }
  });

  // ==================== EMAIL HUB ROUTES ====================

  // Get all email contacts
  app.get('/api/email/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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

  // YouTube Video Analysis Routes
  app.get('/api/video-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const analyses = await storage.getVideoAnalysesByUser(userId);
      res.json(analyses);
    } catch (error) {
      console.error('Error fetching video analyses:', error);
      res.status(500).json({ message: 'Failed to fetch analyses' });
    }
  });

  app.post('/api/video-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { videoUrl } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ message: 'Video URL is required' });
      }

      // Extract video ID from YouTube URL
      const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (!videoIdMatch) {
        return res.status(400).json({ message: 'Invalid YouTube URL' });
      }
      const videoId = videoIdMatch[1];

      // Create initial analysis record
      const analysis = await storage.createVideoAnalysis({
        userId,
        videoUrl,
        videoId,
        status: 'pending',
      });

      // Start async analysis
      analyzeYouTubeVideo(analysis.id, videoId).catch(err => {
        console.error('Error in video analysis:', err);
      });

      res.json(analysis);
    } catch (error) {
      console.error('Error creating video analysis:', error);
      res.status(500).json({ message: 'Failed to create analysis' });
    }
  });

  app.get('/api/video-analysis/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const analysis = await storage.getVideoAnalysis(id);
      if (!analysis || analysis.userId !== userId) {
        return res.status(404).json({ message: 'Analysis not found' });
      }
      res.json(analysis);
    } catch (error) {
      console.error('Error fetching video analysis:', error);
      res.status(500).json({ message: 'Failed to fetch analysis' });
    }
  });

  async function analyzeYouTubeVideo(analysisId: string, videoId: string) {
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      const OpenAI = (await import('openai')).default;

      // Fetch transcript
      let transcript = '';
      try {
        const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
        transcript = transcriptData.map(t => t.text).join(' ');
      } catch (e) {
        console.error('Error fetching transcript:', e);
        await storage.updateVideoAnalysis(analysisId, {
          status: 'failed',
          overallFeedback: 'Could not fetch transcript. The video may not have captions available.',
        });
        return;
      }

      if (!transcript || transcript.length < 50) {
        await storage.updateVideoAnalysis(analysisId, {
          status: 'failed',
          overallFeedback: 'Transcript too short or unavailable for analysis.',
        });
        return;
      }

      // Fetch video info from YouTube API
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      let videoTitle = '';
      let channelName = '';
      let thumbnailUrl = '';

      if (YOUTUBE_API_KEY) {
        try {
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
          );
          const videoData = await videoResponse.json();
          if (videoData.items?.[0]?.snippet) {
            const snippet = videoData.items[0].snippet;
            videoTitle = snippet.title;
            channelName = snippet.channelTitle;
            thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url;
          }
        } catch (e) {
          console.error('Error fetching video info:', e);
        }
      }

      // Analyze with OpenAI
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const analysisPrompt = `You are an expert speaking coach analyzing a speaker based on their video transcript. Analyze the following transcript and provide scores (0-100) and detailed feedback for each category.

TRANSCRIPT:
${transcript.substring(0, 8000)}

Analyze the speaker on these 5 criteria:

1. PRESENCE (How commanding, confident, and engaging is the speaker?)
2. SPEAKING ABILITY (Clarity, articulation, pacing, and flow)
3. FILLER WORDS (Count and impact of filler words like "um", "uh", "like", "you know", "basically", "actually", "so", etc.)
4. APPEARANCE (Based on speaking style, professionalism in word choice, energy level)

For each category, provide:
- A score from 0-100
- Specific feedback with examples from the transcript
- Actionable improvement suggestions

Also provide an OVERALL SCORE (average of all scores) and OVERALL FEEDBACK summarizing the speaker's strengths and areas for improvement.

Respond in this exact JSON format:
{
  "presence": {"score": 85, "feedback": "..."},
  "speakingAbility": {"score": 80, "feedback": "..."},
  "fillerWords": {"score": 70, "feedback": "...", "detected": ["um (5x)", "like (3x)"]},
  "appearance": {"score": 75, "feedback": "..."},
  "overall": {"score": 78, "feedback": "..."}
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: analysisPrompt }],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      await storage.updateVideoAnalysis(analysisId, {
        videoTitle,
        channelName,
        thumbnailUrl,
        transcript: transcript.substring(0, 50000),
        presenceScore: result.presence?.score || 0,
        speakingAbilityScore: result.speakingAbility?.score || 0,
        fillerWordsScore: result.fillerWords?.score || 0,
        appearanceScore: result.appearance?.score || 0,
        overallScore: result.overall?.score || 0,
        presenceFeedback: result.presence?.feedback || '',
        speakingAbilityFeedback: result.speakingAbility?.feedback || '',
        fillerWordsFeedback: result.fillerWords?.feedback || '',
        appearanceFeedback: result.appearance?.feedback || '',
        overallFeedback: result.overall?.feedback || '',
        fillerWordsDetected: result.fillerWords?.detected || [],
        status: 'completed',
        analyzedAt: new Date(),
      });

    } catch (error) {
      console.error('Error analyzing video:', error);
      await storage.updateVideoAnalysis(analysisId, {
        status: 'failed',
        overallFeedback: 'An error occurred during analysis.',
      });
    }
  }

  // ============ UPLOAD-POST INTEGRATION ============

  const UPLOAD_POST_API_BASE = 'https://api.upload-post.com';

  function getUploadPostApiKey(): string {
    const key = process.env.UPLOAD_POST_API_KEY;
    if (!key) throw new Error('UPLOAD_POST_API_KEY not configured');
    return key;
  }

  // Create Upload-Post profile for user (called on first connect)
  app.post('/api/upload-post/create-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const uploadPostUsername = `podlogix_${userId}`;

      const response = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/users`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${getUploadPostApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: uploadPostUsername }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload-Post profile creation error:', error);
        if (response.status === 409) {
          return res.json({ success: true, username: uploadPostUsername, message: 'Profile already exists' });
        }
        return res.status(response.status).json({ message: 'Failed to create Upload-Post profile' });
      }

      const data = await response.json();
      res.json({ success: true, username: uploadPostUsername, ...data });
    } catch (error) {
      console.error('Error creating Upload-Post profile:', error);
      res.status(500).json({ message: 'Failed to create Upload-Post profile' });
    }
  });

  // Generate secure connection URL for OAuth
  app.post('/api/upload-post/connect-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const uploadPostUsername = `podlogix_${userId}`;
      const { platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin'] } = req.body;

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;

      const response = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/users/generate-jwt`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${getUploadPostApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: uploadPostUsername,
          redirect_url: `${baseUrl}/dashboard/social-hub?connected=true`,
          logo_image: `${baseUrl}/favicon.svg`,
          redirect_button_text: 'Return to Podlogix',
          connect_title: 'Connect Your Social Accounts',
          connect_description: 'Link your social media to start posting from Podlogix',
          platforms,
          show_calendar: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload-Post JWT generation error:', error);
        return res.status(response.status).json({ message: 'Failed to generate connection URL' });
      }

      const data = await response.json();
      res.json({ success: true, ...data });
    } catch (error) {
      console.error('Error generating Upload-Post connection URL:', error);
      res.status(500).json({ message: 'Failed to generate connection URL' });
    }
  });

  // Get connected accounts from Upload-Post
  app.get('/api/upload-post/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const uploadPostUsername = `podlogix_${userId}`;

      const response = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/users?username=${uploadPostUsername}`, {
        method: 'GET',
        headers: {
          'Authorization': `ApiKey ${getUploadPostApiKey()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.json({ accounts: [], hasProfile: false });
        }
        const error = await response.text();
        console.error('Upload-Post get accounts error:', error);
        return res.status(response.status).json({ message: 'Failed to fetch accounts' });
      }

      const data = await response.json();

      // Sync accounts to local database
      await storage.deleteUploadPostAccountsByUser(userId);
      if (data.accounts && Array.isArray(data.accounts)) {
        for (const account of data.accounts) {
          await storage.createUploadPostAccount({
            userId,
            uploadPostUsername,
            platform: account.platform || account.type,
            platformAccountId: account.id?.toString(),
            platformUsername: account.username || account.name,
            profileUrl: account.profile_url,
            profilePictureUrl: account.avatar || account.profile_picture,
            isConnected: true,
          });
        }
      }

      res.json({ hasProfile: true, ...data });
    } catch (error) {
      console.error('Error fetching Upload-Post accounts:', error);
      res.status(500).json({ message: 'Failed to fetch accounts' });
    }
  });

  // Get local cached accounts
  app.get('/api/upload-post/local-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const accounts = await storage.getUploadPostAccountsByUser(userId);
      res.json({ accounts });
    } catch (error) {
      console.error('Error fetching local accounts:', error);
      res.status(500).json({ message: 'Failed to fetch local accounts' });
    }
  });

  // Create a post via Upload-Post
  app.post('/api/upload-post/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const uploadPostUsername = `podlogix_${userId}`;
      const { platforms, content, mediaUrl, scheduledAt } = req.body;

      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ message: 'At least one platform is required' });
      }

      if (!content && !mediaUrl) {
        return res.status(400).json({ message: 'Content or media is required' });
      }

      const postData: any = {
        user: uploadPostUsername,
        platform: platforms,
        title: content,
      };

      if (scheduledAt) {
        postData.publish_at = new Date(scheduledAt).toISOString().replace('T', ' ').split('.')[0];
      }

      const response = await fetch(`${UPLOAD_POST_API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${getUploadPostApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload-Post create post error:', error);
        return res.status(response.status).json({ message: 'Failed to create post' });
      }

      const data = await response.json();

      // Save to local database
      const localPost = await storage.createUploadPostPost({
        userId,
        uploadPostPostId: data.post_id?.toString(),
        platforms,
        content,
        mediaUrls: mediaUrl ? [mediaUrl] : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'published',
      });

      res.json({ success: true, post: localPost, ...data });
    } catch (error) {
      console.error('Error creating Upload-Post post:', error);
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // Get user's posts
  app.get('/api/upload-post/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const posts = await storage.getUploadPostPostsByUser(userId);
      res.json({ posts });
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // ============ SOCIAL ANALYTICS (Influencers.club for user's connected accounts) ============
  
  // Get analytics for a user's connected social account
  app.post('/api/social-analytics/profile', isAuthenticated, async (req: any, res) => {
    try {
      const profileSchema = z.object({
        handle: z.string().min(1, 'Handle is required').max(100),
        platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']),
      });

      const parseResult = profileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const { handle, platform } = parseResult.data;

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/enrichment/handle/full/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handle: handle.replace('@', ''),
          platform: platform.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Influencers.club enrich error:', error);
        return res.status(response.status).json({ error: 'Failed to fetch analytics' });
      }

      const data = await response.json();
      
      // Extract key analytics metrics
      const analytics = {
        handle: data.handle || handle,
        platform: platform.toLowerCase(),
        name: data.name || data.fullname || handle,
        bio: data.bio || data.biography,
        profilePicture: data.avatar || data.profile_pic_url,
        followers: data.followers || data.follower_count || 0,
        following: data.following || data.followees_count || 0,
        postsCount: data.posts_count || data.media_count || 0,
        engagementRate: data.engagement_rate || data.avg_engagement_rate || 0,
        avgLikes: data.avg_likes || data.average_likes || 0,
        avgComments: data.avg_comments || data.average_comments || 0,
        avgViews: data.avg_views || data.average_views || 0,
        avgReelLikes: data.avg_reel_likes || 0,
        postsPerMonth: data.posts_per_month || 0,
        email: data.email || null,
        emailVerified: data.email_verified || false,
        location: data.location || data.city || data.country,
        language: data.language,
        businessCategory: data.business_category || data.category,
        isVerified: data.is_verified || data.verified || false,
        // Social links
        socialLinks: data.social_links || data.external_urls || [],
        // Raw data for advanced use
        rawData: data,
      };

      res.json({ success: true, analytics });
    } catch (error) {
      console.error('Error fetching social analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Get analytics for all user's connected accounts
  app.get('/api/social-analytics/my-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const accounts = await storage.getUploadPostAccountsByUser(userId);
      
      if (!accounts || accounts.length === 0) {
        return res.json({ accounts: [], message: 'No connected accounts found' });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const analyticsResults = [];
      const platformMapping: Record<string, string> = {
        'instagram': 'instagram',
        'tiktok': 'tiktok',
        'youtube': 'youtube',
        'twitter': 'twitter',
        'x': 'twitter',
        'twitch': 'twitch',
      };

      for (const account of accounts) {
        const platform = platformMapping[account.platform?.toLowerCase() || ''];
        if (!platform || !account.platformUsername) continue;

        try {
          const response = await fetch('https://api-dashboard.influencers.club/public/v1/enrichment/handle/full/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              handle: account.platformUsername.replace('@', ''),
              platform,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            analyticsResults.push({
              accountId: account.id,
              platform: account.platform,
              handle: account.platformUsername,
              name: data.name || data.fullname || account.platformUsername,
              bio: data.bio || data.biography || null,
              profilePicture: data.avatar || data.profile_pic_url || account.profilePictureUrl,
              followers: data.followers || data.follower_count || 0,
              following: data.following || data.followees_count || 0,
              engagementRate: data.engagement_rate || data.avg_engagement_rate || 0,
              avgLikes: data.avg_likes || data.average_likes || 0,
              avgComments: data.avg_comments || data.average_comments || 0,
              avgViews: data.avg_views || data.average_views || 0,
              avgReelLikes: data.avg_reel_likes || 0,
              postsCount: data.posts_count || data.media_count || 0,
              postsPerMonth: data.posts_per_month || 0,
              location: data.location || data.city || data.country || null,
              language: data.language || null,
              businessCategory: data.business_category || data.category || null,
              isVerified: data.is_verified || data.verified || false,
            });
          }
        } catch (err) {
          console.error(`Error fetching analytics for ${account.platformUsername}:`, err);
        }
      }

      res.json({ success: true, accounts: analyticsResults });
    } catch (error) {
      console.error('Error fetching my account analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Calculate suggested rates based on analytics
  app.post('/api/social-analytics/calculate-rates', isAuthenticated, async (req: any, res) => {
    try {
      const ratesSchema = z.object({
        followers: z.number().min(1, 'Followers must be at least 1'),
        engagementRate: z.number().min(0).max(100).optional().default(2),
        platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']).optional().default('instagram'),
        avgViews: z.number().min(0).optional(),
      });

      const parseResult = ratesSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const { followers, engagementRate, platform, avgViews } = parseResult.data;

      // Rate calculation based on industry standards
      // Base rate per 1000 followers, adjusted by engagement
      const baseRates: Record<string, { post: number; story: number; reel: number; video: number }> = {
        instagram: { post: 10, story: 3, reel: 15, video: 20 },
        tiktok: { post: 8, story: 2, reel: 12, video: 15 },
        youtube: { post: 15, story: 5, reel: 18, video: 25 },
        twitter: { post: 5, story: 0, reel: 0, video: 8 },
        twitch: { post: 12, story: 4, reel: 0, video: 20 },
      };

      const platformRates = baseRates[platform] || baseRates.instagram;
      const engagementMultiplier = Math.max(0.5, Math.min(3, engagementRate / 2));
      const followerMultiplier = Math.max(followers, 1) / 1000; // Guard against 0
      const viewsBonus = avgViews && followers > 0 ? Math.min(1.5, avgViews / followers) : 1;

      const calculateRate = (baseRate: number) => {
        const rate = baseRate * followerMultiplier * engagementMultiplier * viewsBonus;
        return Math.round(Math.max(rate, 25)); // Minimum $25
      };

      const rates = {
        feedPost: calculateRate(platformRates.post),
        story: platformRates.story > 0 ? calculateRate(platformRates.story) : null,
        reel: platformRates.reel > 0 ? calculateRate(platformRates.reel) : null,
        video: calculateRate(platformRates.video),
        // Package deals
        package3Posts: Math.round(calculateRate(platformRates.post) * 2.7),
        packageMonthly: Math.round(calculateRate(platformRates.post) * 8),
      };

      res.json({
        success: true,
        rates,
        breakdown: {
          followers,
          engagementRate: engagementRate || 2,
          engagementMultiplier: engagementMultiplier.toFixed(2),
          platform: platform || 'instagram',
        },
      });
    } catch (error) {
      console.error('Error calculating rates:', error);
      res.status(500).json({ message: 'Failed to calculate rates' });
    }
  });

  // ============ INFLUENCERS.CLUB PRO API FEATURES ============

  // Discovery API - Search creators with 60+ filters and AI-powered search
  app.post('/api/social-analytics/discover', isAuthenticated, async (req: any, res) => {
    try {
      const discoverSchema = z.object({
        platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']).optional(),
        minFollowers: z.number().min(0).optional(),
        maxFollowers: z.number().min(0).optional(),
        minEngagement: z.number().min(0).max(100).optional(),
        maxEngagement: z.number().min(0).max(100).optional(),
        location: z.string().optional(),
        language: z.string().optional(),
        niche: z.string().optional(),
        hasEmail: z.boolean().optional(),
        isVerified: z.boolean().optional(),
        aiPrompt: z.string().max(500).optional(), // AI-powered natural language search
        limit: z.number().min(1).max(100).optional().default(25),
        offset: z.number().min(0).optional().default(0),
      });

      const parseResult = discoverSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const filters = parseResult.data;
      
      // Build discovery request
      const discoveryRequest: Record<string, any> = {
        limit: filters.limit,
        offset: filters.offset,
      };

      if (filters.platform) discoveryRequest.platform = filters.platform;
      if (filters.minFollowers) discoveryRequest.followers_min = filters.minFollowers;
      if (filters.maxFollowers) discoveryRequest.followers_max = filters.maxFollowers;
      if (filters.minEngagement) discoveryRequest.engagement_rate_min = filters.minEngagement;
      if (filters.maxEngagement) discoveryRequest.engagement_rate_max = filters.maxEngagement;
      if (filters.location) discoveryRequest.location = filters.location;
      if (filters.language) discoveryRequest.language = filters.language;
      if (filters.niche) discoveryRequest.niche = filters.niche;
      if (filters.hasEmail !== undefined) discoveryRequest.has_email = filters.hasEmail;
      if (filters.isVerified !== undefined) discoveryRequest.is_verified = filters.isVerified;
      if (filters.aiPrompt) discoveryRequest.ai_prompt = filters.aiPrompt;

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/discovery/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoveryRequest),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Discovery API error:', error);
        return res.status(response.status).json({ error: 'Discovery search failed' });
      }

      const data = await response.json();
      
      const creators = (data.results || data.creators || []).map((creator: any) => ({
        handle: creator.handle || creator.username,
        platform: creator.platform,
        name: creator.name || creator.fullname,
        profilePicture: creator.avatar || creator.profile_pic_url,
        followers: creator.followers || creator.follower_count || 0,
        engagementRate: creator.engagement_rate || 0,
        avgViews: creator.avg_views || 0,
        email: creator.email || null,
        emailVerified: creator.email_verified || false,
        location: creator.location || creator.country,
        niche: creator.niche || creator.category,
        isVerified: creator.is_verified || false,
        estimatedMonthlyIncome: creator.estimated_monthly_income || null,
        fakeFollowerPercent: creator.fake_follower_percent || null,
      }));

      res.json({
        success: true,
        creators,
        total: data.total || creators.length,
        offset: filters.offset,
        limit: filters.limit,
      });
    } catch (error) {
      console.error('Error in discovery search:', error);
      res.status(500).json({ message: 'Failed to search creators' });
    }
  });

  // Lookalikes API - Find similar creators
  app.post('/api/social-analytics/lookalikes', isAuthenticated, async (req: any, res) => {
    try {
      const lookalikesSchema = z.object({
        handle: z.string().min(1).max(100),
        platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']),
        limit: z.number().min(1).max(50).optional().default(20),
        // Additional filters for lookalikes
        minFollowers: z.number().min(0).optional(),
        maxFollowers: z.number().min(0).optional(),
        location: z.string().optional(),
      });

      const parseResult = lookalikesSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { handle, platform, limit, minFollowers, maxFollowers, location } = parseResult.data;

      const requestBody: Record<string, any> = {
        handle: handle.replace('@', ''),
        platform,
        limit,
      };

      if (minFollowers) requestBody.followers_min = minFollowers;
      if (maxFollowers) requestBody.followers_max = maxFollowers;
      if (location) requestBody.location = location;

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/lookalikes/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Lookalikes API error:', error);
        return res.status(response.status).json({ error: 'Failed to find lookalikes' });
      }

      const data = await response.json();
      
      const lookalikes = (data.results || data.lookalikes || []).map((creator: any) => ({
        handle: creator.handle || creator.username,
        platform: creator.platform || platform,
        name: creator.name || creator.fullname,
        profilePicture: creator.avatar || creator.profile_pic_url,
        followers: creator.followers || creator.follower_count || 0,
        engagementRate: creator.engagement_rate || 0,
        avgViews: creator.avg_views || 0,
        email: creator.email || null,
        location: creator.location,
        niche: creator.niche || creator.category,
        similarityScore: creator.similarity_score || creator.match_score || null,
      }));

      res.json({
        success: true,
        originalHandle: handle,
        originalPlatform: platform,
        lookalikes,
      });
    } catch (error) {
      console.error('Error finding lookalikes:', error);
      res.status(500).json({ message: 'Failed to find similar creators' });
    }
  });

  // Email Enrichment API - Enrich by email (basic or advanced)
  app.post('/api/social-analytics/enrich-email', isAuthenticated, async (req: any, res) => {
    try {
      const enrichSchema = z.object({
        email: z.string().email(),
        mode: z.enum(['basic', 'advanced']).optional().default('advanced'),
      });

      const parseResult = enrichSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { email, mode } = parseResult.data;
      const endpoint = mode === 'basic' 
        ? 'https://api-dashboard.influencers.club/public/v1/enrichment/email/basic/'
        : 'https://api-dashboard.influencers.club/public/v1/enrichment/email/advanced/';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Email enrichment error:', error);
        return res.status(response.status).json({ error: 'Email enrichment failed' });
      }

      const data = await response.json();

      const profiles = (data.profiles || data.social_profiles || [data]).filter((p: any) => p).map((profile: any) => ({
        platform: profile.platform,
        handle: profile.handle || profile.username,
        name: profile.name || profile.fullname,
        profilePicture: profile.avatar || profile.profile_pic_url,
        followers: profile.followers || profile.follower_count || 0,
        engagementRate: profile.engagement_rate || 0,
        isVerified: profile.is_verified || false,
        bio: profile.bio || profile.biography,
      }));

      res.json({
        success: true,
        email,
        mode,
        name: data.name || data.fullname,
        profiles,
        socialLinks: data.social_links || [],
        estimatedMonthlyIncome: data.estimated_monthly_income,
      });
    } catch (error) {
      console.error('Error enriching email:', error);
      res.status(500).json({ message: 'Failed to enrich email' });
    }
  });

  // Get Creator Posts with Engagement Metrics
  app.post('/api/social-analytics/posts', isAuthenticated, async (req: any, res) => {
    try {
      const postsSchema = z.object({
        handle: z.string().min(1).max(100),
        platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']),
        limit: z.number().min(1).max(50).optional().default(12),
      });

      const parseResult = postsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { handle, platform, limit } = parseResult.data;

      // First enrich to get posts data
      const response = await fetch('https://api-dashboard.influencers.club/public/v1/enrichment/handle/full/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handle: handle.replace('@', ''),
          platform,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Posts API error:', error);
        return res.status(response.status).json({ error: 'Failed to fetch posts' });
      }

      const data = await response.json();
      
      const posts = (data.recent_posts || data.posts || data.latest_posts || []).slice(0, limit).map((post: any) => ({
        id: post.id || post.post_id,
        type: post.type || post.media_type || 'post',
        caption: post.caption || post.text || post.title,
        thumbnail: post.thumbnail || post.thumbnail_url || post.image,
        url: post.url || post.permalink,
        likes: post.likes || post.like_count || 0,
        comments: post.comments || post.comment_count || 0,
        views: post.views || post.view_count || 0,
        shares: post.shares || post.share_count || 0,
        engagementRate: post.engagement_rate || 0,
        postedAt: post.posted_at || post.timestamp || post.created_at,
      }));

      res.json({
        success: true,
        handle,
        platform,
        posts,
        avgLikes: data.avg_likes || 0,
        avgComments: data.avg_comments || 0,
        avgViews: data.avg_views || 0,
        postsPerMonth: data.posts_per_month || 0,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Check API Credits and Usage
  app.get('/api/social-analytics/credits', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/account/credits/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Credits API error:', error);
        return res.status(response.status).json({ error: 'Failed to fetch credits' });
      }

      const data = await response.json();

      res.json({
        success: true,
        credits: {
          available: data.credits_available || data.remaining || data.balance || 0,
          used: data.credits_used || data.used || 0,
          total: data.credits_total || data.total || 0,
          plan: data.plan || data.subscription_plan || 'PRO',
          resetDate: data.reset_date || data.billing_cycle_end,
        },
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
      res.status(500).json({ message: 'Failed to fetch credits' });
    }
  });

  // Batch Enrichment - Create batch job
  app.post('/api/social-analytics/batch/create', isAuthenticated, async (req: any, res) => {
    try {
      const batchSchema = z.object({
        handles: z.array(z.object({
          handle: z.string().min(1).max(100),
          platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'twitch']),
        })).min(1).max(1000),
      });

      const parseResult = batchSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.issues });
      }

      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { handles } = parseResult.data;

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/batch/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: handles.map(h => ({
            handle: h.handle.replace('@', ''),
            platform: h.platform,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Batch create error:', error);
        return res.status(response.status).json({ error: 'Failed to create batch job' });
      }

      const data = await response.json();

      res.json({
        success: true,
        batchId: data.batch_id || data.id,
        itemCount: handles.length,
        status: data.status || 'processing',
        estimatedCredits: data.estimated_credits || handles.length * 2,
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({ message: 'Failed to create batch job' });
    }
  });

  // Batch Enrichment - Check status
  app.get('/api/social-analytics/batch/:batchId/status', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { batchId } = req.params;

      const response = await fetch(`https://api-dashboard.influencers.club/public/v1/batch/${batchId}/status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch batch status' });
      }

      const data = await response.json();

      res.json({
        success: true,
        batchId,
        status: data.status,
        progress: data.progress || 0,
        completed: data.completed || 0,
        total: data.total || 0,
        errors: data.errors || 0,
      });
    } catch (error) {
      console.error('Error fetching batch status:', error);
      res.status(500).json({ message: 'Failed to fetch batch status' });
    }
  });

  // Batch Enrichment - Download results
  app.get('/api/social-analytics/batch/:batchId/results', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const { batchId } = req.params;

      const response = await fetch(`https://api-dashboard.influencers.club/public/v1/batch/${batchId}/results/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch batch results' });
      }

      const data = await response.json();

      const results = (data.results || []).map((item: any) => ({
        handle: item.handle,
        platform: item.platform,
        name: item.name || item.fullname,
        profilePicture: item.avatar || item.profile_pic_url,
        followers: item.followers || 0,
        engagementRate: item.engagement_rate || 0,
        avgViews: item.avg_views || 0,
        email: item.email,
        emailVerified: item.email_verified || false,
        location: item.location,
        niche: item.niche || item.category,
        isVerified: item.is_verified || false,
        estimatedMonthlyIncome: item.estimated_monthly_income,
        fakeFollowerPercent: item.fake_follower_percent,
        error: item.error,
      }));

      res.json({
        success: true,
        batchId,
        results,
        total: results.length,
      });
    } catch (error) {
      console.error('Error fetching batch results:', error);
      res.status(500).json({ message: 'Failed to fetch batch results' });
    }
  });

  // Get available locations for discovery filters
  app.get('/api/social-analytics/filters/locations', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const platform = req.query.platform || 'instagram';

      const response = await fetch(`https://api-dashboard.influencers.club/public/v1/filters/locations/?platform=${platform}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        // Return default locations if API fails
        return res.json({
          success: true,
          locations: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Brazil', 'Mexico', 'India', 'Japan'],
        });
      }

      const data = await response.json();
      res.json({ success: true, locations: data.locations || data });
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.json({ success: true, locations: ['United States', 'United Kingdom', 'Canada', 'Australia'] });
    }
  });

  // Get available languages for discovery filters
  app.get('/api/social-analytics/filters/languages', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/filters/languages/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return res.json({
          success: true,
          languages: ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Chinese', 'Hindi', 'Arabic'],
        });
      }

      const data = await response.json();
      res.json({ success: true, languages: data.languages || data });
    } catch (error) {
      console.error('Error fetching languages:', error);
      res.json({ success: true, languages: ['English', 'Spanish', 'Portuguese', 'French', 'German'] });
    }
  });

  // Get available niches/categories for discovery filters
  app.get('/api/social-analytics/filters/niches', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = getInfluencersClubApiKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'Analytics API not configured' });
      }

      const response = await fetch('https://api-dashboard.influencers.club/public/v1/filters/niches/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return res.json({
          success: true,
          niches: [
            'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Technology', 'Gaming', 
            'Music', 'Sports', 'Business', 'Education', 'Entertainment', 'Lifestyle',
            'Health', 'Parenting', 'Pets', 'Art', 'Photography', 'Comedy', 'DIY'
          ],
        });
      }

      const data = await response.json();
      res.json({ success: true, niches: data.niches || data.categories || data });
    } catch (error) {
      console.error('Error fetching niches:', error);
      res.json({ 
        success: true, 
        niches: ['Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Technology', 'Gaming', 'Music'] 
      });
    }
  });

  // ==================== CLIENT PORTAL ROUTES ====================
  
  // Get all saved creators for the current user
  app.get('/api/client-portal/saved-creators', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const creators = await db
        .select()
        .from(clientSavedCreators)
        .where(eq(clientSavedCreators.userId, userId))
        .orderBy(desc(clientSavedCreators.createdAt));
      
      res.json(creators);
    } catch (error) {
      console.error('Error fetching saved creators:', error);
      res.status(500).json({ message: 'Failed to fetch saved creators' });
    }
  });

  // Save a new creator
  app.post('/api/client-portal/saved-creators', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const finiteInt = z.number().optional().transform(val => {
        if (val === undefined || val === null) return undefined;
        if (!isFinite(val)) return undefined;
        return Math.round(Math.max(0, val));
      });

      const schema = z.object({
        platform: z.string(),
        platformUserId: z.string().optional(),
        username: z.string(),
        displayName: z.string().optional(),
        profilePicUrl: z.string().optional(),
        bio: z.string().optional(),
        followerCount: finiteInt,
        engagementRate: finiteInt,
        avgViews: finiteInt,
        avgLikes: finiteInt,
        location: z.string().optional(),
        categories: z.array(z.string()).optional(),
        email: z.string().optional(),
        estimatedPostRate: finiteInt,
        estimatedStoryRate: finiteInt,
        estimatedVideoRate: finiteInt,
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.string().optional(),
        listName: z.string().optional(),
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() });
      }

      const data = parseResult.data;

      // Check if already saved
      const existing = await db
        .select()
        .from(clientSavedCreators)
        .where(
          and(
            eq(clientSavedCreators.userId, userId),
            eq(clientSavedCreators.platform, data.platform),
            eq(clientSavedCreators.username, data.username)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Creator already saved' });
      }

      const [creator] = await db
        .insert(clientSavedCreators)
        .values({
          userId,
          ...data,
        })
        .returning();

      res.json(creator);
    } catch (error) {
      console.error('Error saving creator:', error);
      res.status(500).json({ message: 'Failed to save creator' });
    }
  });

  // Update a saved creator
  app.patch('/api/client-portal/saved-creators/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      const schema = z.object({
        status: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        listName: z.string().optional(),
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() });
      }

      const [updated] = await db
        .update(clientSavedCreators)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(
          and(
            eq(clientSavedCreators.id, id),
            eq(clientSavedCreators.userId, userId)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating creator:', error);
      res.status(500).json({ message: 'Failed to update creator' });
    }
  });

  // Delete a saved creator
  app.delete('/api/client-portal/saved-creators/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(clientSavedCreators)
        .where(
          and(
            eq(clientSavedCreators.id, id),
            eq(clientSavedCreators.userId, userId)
          )
        )
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting creator:', error);
      res.status(500).json({ message: 'Failed to delete creator' });
    }
  });

  return httpServer;
}
