import { z } from "zod";

export const CONTACT_CATEGORIES = [
  "guest",
  "subscriber",
  "sponsor",
  "collaborator",
  "team",
] as const;

export const normalizedEmailSchema = z.string()
  .trim()
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

const nullableText = (max: number) => z.union([
  z.string().trim().max(max),
  z.null(),
]).transform((value) => value === "" ? null : value).optional();

export const emailContactCreateInputSchema = z.object({
  email: normalizedEmailSchema,
  firstName: nullableText(120),
  lastName: nullableText(120),
  company: nullableText(240),
  title: nullableText(240),
  category: z.enum(CONTACT_CATEGORIES).optional(),
  notes: nullableText(10_000),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).nullable().optional(),
  isSubscribed: z.boolean().optional(),
}).strict();

export const emailContactUpdateInputSchema = emailContactCreateInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one contact field is required");

export const guestContactInputSchema = z.object({
  email: normalizedEmailSchema,
  firstName: nullableText(120),
  lastName: nullableText(120),
  company: nullableText(240),
  title: nullableText(240),
}).strict();

export function contactNameParts(displayName: string): { firstName: string | null; lastName: string | null } {
  const parts = displayName
    .replace(/^(dr|doctor|mr|mrs|ms|prof|professor)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  return { firstName: parts[0] ?? null, lastName: parts.slice(1).join(" ") || null };
}
