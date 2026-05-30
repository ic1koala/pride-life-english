import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Password-based auth
  passwordHash: varchar("passwordHash", { length: 256 }),
  avatarUrl: text("avatarUrl"),
  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "active",
    "inactive",
    "past_due",
    "canceled",
    "trialing",
    "suspended",
  ]).default("inactive").notNull(),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),
  streakFreezesActive: int("streakFreezesActive").default(0).notNull(),
  suspensionsUsedCount: int("suspensionsUsedCount").default(0).notNull(),
  // Course & Semester system
  activeCourse: mysqlEnum("activeCourse", ["star", "knowledge"]).default("star").notNull(),
  semesterStartDate: timestamp("semesterStartDate"),
  semesterNumber: int("semesterNumber").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Lessons ─────────────────────────────────────────────────────────────────
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  weekNumber: int("weekNumber").notNull(),
  dayNumber: int("dayNumber").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  videoUrl: varchar("videoUrl", { length: 512 }),
  journalingPrompt: text("journalingPrompt"),
  speakingPrompt: text("speakingPrompt"),
  orderIndex: int("orderIndex").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

// ─── Member Progress ──────────────────────────────────────────────────────────
export const memberProgress = mysqlTable("memberProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  completedAt: timestamp("completedAt"),
  journalEntry: text("journalEntry"),
  speakingTranscription: text("speakingTranscription"),
  speakingFeedback: text("speakingFeedback"),
  speakingAudioUrl: varchar("speakingAudioUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemberProgress = typeof memberProgress.$inferSelect;
export type InsertMemberProgress = typeof memberProgress.$inferInsert;

// ─── Login Bonuses ────────────────────────────────────────────────────────────
export const loginBonuses = mysqlTable("loginBonuses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  loginDate: varchar("loginDate", { length: 10 }).notNull(),
  streakDay: int("streakDay").notNull().default(1),
  pointsEarned: int("pointsEarned").notNull().default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginBonus = typeof loginBonuses.$inferSelect;
export type InsertLoginBonus = typeof loginBonuses.$inferInsert;

// ─── Milestone Badges ─────────────────────────────────────────────────────────
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeType: varchar("badgeType", { length: 64 }).notNull(),
  badgeLabel: varchar("badgeLabel", { length: 128 }).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type Milestone = typeof milestones.$inferSelect;

// ─── Q&A Posts ────────────────────────────────────────────────────────────────
export const qaPosts = mysqlTable("qaPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  body: text("body").notNull(),
  likesCount: int("likesCount").notNull().default(0),
  answersCount: int("answersCount").notNull().default(0),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QaPost = typeof qaPosts.$inferSelect;
export type InsertQaPost = typeof qaPosts.$inferInsert;

// ─── Q&A Answers ─────────────────────────────────────────────────────────────
export const qaAnswers = mysqlTable("qaAnswers", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  body: text("body").notNull(),
  likesCount: int("likesCount").notNull().default(0),
  isBestAnswer: boolean("isBestAnswer").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QaAnswer = typeof qaAnswers.$inferSelect;
export type InsertQaAnswer = typeof qaAnswers.$inferInsert;

// ─── Q&A Likes ───────────────────────────────────────────────────────────────
export const qaLikes = mysqlTable("qaLikes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId"),
  answerId: int("answerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "login_bonus",
    "new_lesson",
    "payment_failed",
    "milestone",
    "general",
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Cohorts (Archive System) ────────────────────────────────────────────────
export const cohorts = mysqlTable("cohorts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  archivePassword: varchar("archivePassword", { length: 256 }),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;

// ─── Member Task Progress ───────────────────────────────────────────────────
export const memberTaskProgress = mysqlTable("memberTaskProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  taskKey: varchar("taskKey", { length: 64 }).notNull(),
  pointsEarned: int("pointsEarned").notNull().default(0),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type MemberTaskProgress = typeof memberTaskProgress.$inferSelect;
export type InsertMemberTaskProgress = typeof memberTaskProgress.$inferInsert;

// ─── Point Transactions ──────────────────────────────────────────────────────
export const pointTransactions = mysqlTable("pointTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;
