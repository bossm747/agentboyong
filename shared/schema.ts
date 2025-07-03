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
  source: text("source"), // 'conversation', 'research', 'external', 'experience', 'tool_creation'
  confidence: doublePrecision("confidence").default(0.8).notNull(), // 0-1 scale
  tags: text("tags").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dynamic tool creation and learning
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(), // 'python', 'javascript', 'bash'
  category: text("category").notNull(), // 'analysis', 'automation', 'research', 'security'
  successCount: integer("success_count").default(0).notNull(),
  failureCount: integer("failure_count").default(0).notNull(),
  effectiveness: doublePrecision("effectiveness").default(0.5).notNull(), // 0-1 scale
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Learning experiences and problem-solving patterns
export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  problemType: text("problem_type").notNull(),
  problemDescription: text("problem_description").notNull(),
  solutionApproach: text("solution_approach").notNull(),
  toolsUsed: text("tools_used").array().default([]).notNull(),
  outcome: text("outcome").notNull(), // 'success', 'partial_success', 'failure'
  learningInsights: text("learning_insights").notNull(),
  applicability: text("applicability").array().default([]).notNull(), // similar problem contexts
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Autonomous reasoning and thought processes
export const reasoningChains = pgTable("reasoning_chains", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  problemStatement: text("problem_statement").notNull(),
  thoughtProcess: jsonb("thought_process").notNull(), // step-by-step reasoning
  toolsConsidered: text("tools_considered").array().default([]).notNull(),
  toolsSelected: text("tools_selected").array().default([]).notNull(),
  executionPlan: text("execution_plan").notNull(),
  result: text("result"),
  reflections: text("reflections"), // what was learned
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Application instances running in the sandbox
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  port: integer("port").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("starting"), // 'starting', 'running', 'stopped', 'error'
  processId: integer("process_id"),
  startCommand: text("start_command").notNull(),
  framework: text("framework"), // 'react', 'vue', 'express', 'fastapi', etc.
  language: text("language"), // 'javascript', 'python', 'typescript', etc.
  directory: text("directory").notNull(),
  logs: text("logs").array().default([]).notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Background process tracking for real-time visibility
export const backgroundTasks = pgTable("background_tasks", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  taskType: text("task_type").notNull(), // 'file_operation', 'code_execution', 'research', 'analysis', 'installation'
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("running"), // 'running', 'completed', 'failed', 'cancelled'
  progress: integer("progress").default(0).notNull(), // 0-100
  currentStep: text("current_step"),
  totalSteps: integer("total_steps"),
  output: text("output").array().default([]).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration"), // in seconds
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

export const insertToolSchema = createInsertSchema(tools).pick({
  userId: true,
  name: true,
  description: true,
  code: true,
  language: true,
  category: true,
});

export const insertExperienceSchema = createInsertSchema(experiences).pick({
  userId: true,
  problemType: true,
  problemDescription: true,
  solutionApproach: true,
  toolsUsed: true,
  outcome: true,
  learningInsights: true,
  applicability: true,
});

export const insertReasoningChainSchema = createInsertSchema(reasoningChains).pick({
  userId: true,
  sessionId: true,
  problemStatement: true,
  thoughtProcess: true,
  toolsConsidered: true,
  toolsSelected: true,
  executionPlan: true,
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  sessionId: true,
  name: true,
  description: true,
  port: true,
  url: true,
  status: true,
  processId: true,
  startCommand: true,
  framework: true,
  language: true,
  directory: true,
});

export const insertBackgroundTaskSchema = createInsertSchema(backgroundTasks).pick({
  sessionId: true,
  taskType: true,
  title: true,
  description: true,
  status: true,
  progress: true,
  currentStep: true,
  totalSteps: true,
  output: true,
  errorMessage: true,
  estimatedDuration: true,
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

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience = typeof experiences.$inferSelect;

export type InsertReasoningChain = z.infer<typeof insertReasoningChainSchema>;
export type ReasoningChain = typeof reasoningChains.$inferSelect;

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

export type InsertBackgroundTask = z.infer<typeof insertBackgroundTaskSchema>;
export type BackgroundTask = typeof backgroundTasks.$inferSelect;

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

export const toolsRelations = relations(tools, ({ one }) => ({
  user: one(users, {
    fields: [tools.userId],
    references: [users.id],
  }),
}));

export const experiencesRelations = relations(experiences, ({ one }) => ({
  user: one(users, {
    fields: [experiences.userId],
    references: [users.id],
  }),
}));

export const reasoningChainsRelations = relations(reasoningChains, ({ one }) => ({
  user: one(users, {
    fields: [reasoningChains.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [reasoningChains.sessionId],
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
