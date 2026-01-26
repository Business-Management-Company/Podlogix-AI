import { db } from "./db";
import { subscribers, messages, identityAssets, type Subscriber, type InsertSubscriber, type Message, type InsertMessage, type IdentityAsset, type InsertIdentityAsset } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  createMessage(message: InsertMessage): Promise<Message>;
  createIdentityAsset(asset: InsertIdentityAsset): Promise<IdentityAsset>;
  getIdentityAsset(id: string): Promise<IdentityAsset | undefined>;
  getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]>;
  updateIdentityAsset(id: string, updates: Partial<IdentityAsset>): Promise<IdentityAsset | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
    return subscriber;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async createIdentityAsset(insertAsset: InsertIdentityAsset): Promise<IdentityAsset> {
    const [asset] = await db.insert(identityAssets).values(insertAsset).returning();
    return asset;
  }

  async getIdentityAsset(id: string): Promise<IdentityAsset | undefined> {
    const [asset] = await db.select().from(identityAssets).where(eq(identityAssets.id, id));
    return asset;
  }

  async getIdentityAssetsByEmail(email: string): Promise<IdentityAsset[]> {
    return await db.select().from(identityAssets).where(eq(identityAssets.email, email));
  }

  async updateIdentityAsset(id: string, updates: Partial<IdentityAsset>): Promise<IdentityAsset | undefined> {
    const [updated] = await db.update(identityAssets).set(updates).where(eq(identityAssets.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
