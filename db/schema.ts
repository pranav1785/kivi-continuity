import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transcripts = sqliteTable("transcripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rawText: text("raw_text").notNull(),
  formattedText: text("formatted_text").notNull(),
  app: text("app").notNull(),
  project: text("project").notNull(),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  subject: text("subject").notNull(),
  value: text("value").notNull(),
  project: text("project").notNull(),
  status: text("status").notNull().default("active"),
  confidence: real("confidence").notNull().default(0.8),
  importance: integer("importance").notNull().default(2),
  useCount: integer("use_count").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memorySources = sqliteTable("memory_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memoryId: integer("memory_id").notNull(),
  transcriptId: integer("transcript_id").notNull(),
  relation: text("relation").notNull().default("created"),
  excerpt: text("excerpt").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memoryDecisions = sqliteTable("memory_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transcriptId: integer("transcript_id").notNull(),
  memoryId: integer("memory_id"),
  outcome: text("outcome").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const clarifications = sqliteTable("clarifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  question: text("question").notNull(),
  memoryIds: text("memory_ids").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  payload: text("payload").notNull(),
  authority: text("authority").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  memoryConsent: integer("memory_consent", { mode: "boolean" }).notNull().default(false),
  authorityLevel: text("authority_level").notNull().default("confirm"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
