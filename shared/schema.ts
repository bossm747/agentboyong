import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
