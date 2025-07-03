import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  status: text("status").notNull().default("active"),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const processes = pgTable("processes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  pid: integer("pid").notNull(),
  name: text("name").notNull(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  cpuUsage: integer("cpu_usage").default(0),
  memoryUsage: integer("memory_usage").default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
});

export const environmentVariables = pgTable("environment_variables", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversation history for persistent memory
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  mode: text("mode").default('default').notNull(), // 'developer', 'researcher', 'hacker', 'default'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Long-term memory storage
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(), // 'preference', 'fact', 'context', 'skill'
  key: text("key").notNull(),
  value: text("value").notNull(),
  importance: integer("importance").default(1).notNull(), // 1-10 scale
  lastAccessed: timestamp("last_accessed").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Knowledge base for cumulative learning
export const knowledge = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  source: text("source"), // 'conversation', 'research', 'external'
  confidence: doublePrecision("confidence").default(0.8).notNull(), // 0-1 scale
  tags: text("tags").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  status: true,
}).partial();

export const insertFileSchema = createInsertSchema(files).pick({
  sessionId: true,
  path: true,
  content: true,
  mimeType: true,
  size: true,
});

export const insertProcessSchema = createInsertSchema(processes).pick({
  sessionId: true,
  pid: true,
  name: true,
  command: true,
  status: true,
  cpuUsage: true,
  memoryUsage: true,
});

export const insertEnvironmentVariableSchema = createInsertSchema(environmentVariables).pick({
  sessionId: true,
  key: true,
  value: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  sessionId: true,
  userId: true,
  role: true,
  content: true,
  mode: true,
});

export const insertMemorySchema = createInsertSchema(memories).pick({
  userId: true,
  category: true,
  key: true,
  value: true,
  importance: true,
});

export const insertKnowledgeSchema = createInsertSchema(knowledge).pick({
  userId: true,
  topic: true,
  content: true,
  source: true,
  confidence: true,
  tags: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertProcess = z.infer<typeof insertProcessSchema>;
export type Process = typeof processes.$inferSelect;

export type InsertEnvironmentVariable = z.infer<typeof insertEnvironmentVariableSchema>;
export type EnvironmentVariable = typeof environmentVariables.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;

export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledge.$inferSelect;

// Database relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  files: many(files),
  processes: many(processes),
  environmentVariables: many(environmentVariables),
}));

export const filesRelations = relations(files, ({ one }) => ({
  session: one(sessions, {
    fields: [files.sessionId],
    references: [sessions.id],
  }),
}));

export const processesRelations = relations(processes, ({ one }) => ({
  session: one(sessions, {
    fields: [processes.sessionId],
    references: [sessions.id],
  }),
}));

export const environmentVariablesRelations = relations(environmentVariables, ({ one }) => ({
  session: one(sessions, {
    fields: [environmentVariables.sessionId],
    references: [sessions.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  session: one(sessions, {
    fields: [conversations.sessionId],
    references: [sessions.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(users, {
    fields: [memories.userId],
    references: [users.id],
  }),
}));

export const knowledgeRelations = relations(knowledge, ({ one }) => ({
  user: one(users, {
    fields: [knowledge.userId],
    references: [users.id],
  }),
}));

export interface SystemStats {
  cpu: number;
  memory: { used: number; total: number };
  disk: { used: number; total: number };
  processes: number;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  size?: number;
  mimeType?: string;
}

export interface TerminalMessage {
  type: 'input' | 'output' | 'error' | 'system';
  data: string;
  timestamp: number;
}
