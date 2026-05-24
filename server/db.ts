import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertLesson,
  InsertLoginBonus,
  InsertMemberProgress,
  InsertNotification,
  InsertQaAnswer,
  InsertQaPost,
  InsertUser,
  cohorts,
  InsertCohort,
  lessons,
  loginBonuses,
  memberProgress,
  milestones,
  notifications,
  qaAnswers,
  qaLikes,
  qaPosts,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(users).values(data);
  return getUserByEmail(data.email!);
}

export async function updateUserSubscription(userId: number, data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing";
  subscriptionCurrentPeriodEnd?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserSubscriptionByStripeCustomerId(stripeCustomerId: string, data: {
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing";
  subscriptionCurrentPeriodEnd?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.stripeCustomerId, stripeCustomerId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function adminUpdateUserSubscription(userId: number, status: "active" | "inactive" | "past_due" | "canceled" | "trialing") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, userId));
}

// ─── Lessons ─────────────────────────────────────────────────────────────────
export async function getAllLessons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).orderBy(lessons.orderIndex);
}

export async function getLessonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0];
}

export async function getLessonsByWeek(weekNumber: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.weekNumber, weekNumber)).orderBy(lessons.dayNumber);
}

export async function upsertLesson(data: InsertLesson) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lessons).values(data).onDuplicateKeyUpdate({ set: data });
}

export async function getAllLessonsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).orderBy(lessons.weekNumber, lessons.dayNumber);
}

export async function deleteLessonById(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lessons).where(eq(lessons.id, id));
}

export async function toggleLessonPublish(id: number, publish: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set({ publishedAt: publish ? new Date() : null }).where(eq(lessons.id, id));
}

export async function updateLesson(id: number, data: Partial<InsertLesson>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set(data).where(eq(lessons.id, id));
}

export async function createLesson(data: InsertLesson) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lessons).values(data);
  const result = await db.select().from(lessons).where(and(eq(lessons.weekNumber, data.weekNumber), eq(lessons.dayNumber, data.dayNumber))).limit(1);
  return result[0];
}

// ─── Member Progress ──────────────────────────────────────────────────────────
export async function getUserProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberProgress).where(eq(memberProgress.userId, userId)).orderBy(memberProgress.lessonId);
}

export async function getLessonProgress(userId: number, lessonId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberProgress).where(and(eq(memberProgress.userId, userId), eq(memberProgress.lessonId, lessonId))).limit(1);
  return result[0];
}

export async function upsertLessonProgress(data: InsertMemberProgress) {
  const db = await getDb();
  if (!db) return;
  const existing = await getLessonProgress(data.userId, data.lessonId);
  if (existing) {
    await db.update(memberProgress).set(data).where(and(eq(memberProgress.userId, data.userId), eq(memberProgress.lessonId, data.lessonId)));
  } else {
    await db.insert(memberProgress).values(data);
  }
}

export async function getCompletedLessonCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(memberProgress).where(and(eq(memberProgress.userId, userId), isNotNull(memberProgress.completedAt)));
  return Number(result[0]?.count ?? 0);
}

// ─── Login Bonuses ────────────────────────────────────────────────────────────
export async function getTodayLoginBonus(userId: number, today: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loginBonuses).where(and(eq(loginBonuses.userId, userId), eq(loginBonuses.loginDate, today))).limit(1);
  return result[0];
}

export async function getLoginBonusHistory(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loginBonuses).where(eq(loginBonuses.userId, userId)).orderBy(desc(loginBonuses.loginDate)).limit(limit);
}

export async function recordLoginBonus(data: InsertLoginBonus) {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginBonuses).values(data);
}

export async function getTotalPoints(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sql<number>`sum(pointsEarned)` }).from(loginBonuses).where(eq(loginBonuses.userId, userId));
  return Number(result[0]?.total ?? 0);
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export async function getUserMilestones(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.earnedAt);
}

export async function awardMilestone(userId: number, badgeType: string, badgeLabel: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(milestones).where(and(eq(milestones.userId, userId), eq(milestones.badgeType, badgeType))).limit(1);
  if (existing.length > 0) return;
  await db.insert(milestones).values({ userId, badgeType, badgeLabel });
}

// ─── Q&A Posts ────────────────────────────────────────────────────────────────
export async function getQaPosts(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: qaPosts.id, userId: qaPosts.userId, title: qaPosts.title, body: qaPosts.body, likesCount: qaPosts.likesCount, answersCount: qaPosts.answersCount, isPinned: qaPosts.isPinned, createdAt: qaPosts.createdAt, updatedAt: qaPosts.updatedAt, authorName: users.name }).from(qaPosts).leftJoin(users, eq(qaPosts.userId, users.id)).orderBy(desc(qaPosts.isPinned), desc(qaPosts.createdAt)).limit(limit).offset(offset);
}

export async function getQaPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: qaPosts.id, userId: qaPosts.userId, title: qaPosts.title, body: qaPosts.body, likesCount: qaPosts.likesCount, answersCount: qaPosts.answersCount, isPinned: qaPosts.isPinned, createdAt: qaPosts.createdAt, updatedAt: qaPosts.updatedAt, authorName: users.name }).from(qaPosts).leftJoin(users, eq(qaPosts.userId, users.id)).where(eq(qaPosts.id, id)).limit(1);
  return result[0];
}

export async function createQaPost(data: InsertQaPost) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(qaPosts).values(data);
  const result = await db.select().from(qaPosts).where(and(eq(qaPosts.userId, data.userId), eq(qaPosts.title, data.title))).orderBy(desc(qaPosts.createdAt)).limit(1);
  return result[0];
}

export async function getQaAnswers(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: qaAnswers.id, postId: qaAnswers.postId, userId: qaAnswers.userId, body: qaAnswers.body, likesCount: qaAnswers.likesCount, isBestAnswer: qaAnswers.isBestAnswer, createdAt: qaAnswers.createdAt, updatedAt: qaAnswers.updatedAt, authorName: users.name }).from(qaAnswers).leftJoin(users, eq(qaAnswers.userId, users.id)).where(eq(qaAnswers.postId, postId)).orderBy(desc(qaAnswers.isBestAnswer), qaAnswers.createdAt);
}

export async function createQaAnswer(data: InsertQaAnswer) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(qaAnswers).values(data);
  await db.update(qaPosts).set({ answersCount: sql`answersCount + 1` }).where(eq(qaPosts.id, data.postId));
  const result = await db.select().from(qaAnswers).where(eq(qaAnswers.postId, data.postId)).orderBy(desc(qaAnswers.createdAt)).limit(1);
  return result[0];
}

export async function markBestAnswer(answerId: number, postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(qaAnswers).set({ isBestAnswer: false }).where(eq(qaAnswers.postId, postId));
  await db.update(qaAnswers).set({ isBestAnswer: true }).where(eq(qaAnswers.id, answerId));
}

export async function toggleLike(userId: number, postId?: number, answerId?: number) {
  const db = await getDb();
  if (!db) return { liked: false };
  const condition = postId ? and(eq(qaLikes.userId, userId), eq(qaLikes.postId, postId)) : and(eq(qaLikes.userId, userId), eq(qaLikes.answerId, answerId!));
  const existing = await db.select().from(qaLikes).where(condition).limit(1);
  if (existing.length > 0) {
    await db.delete(qaLikes).where(condition);
    if (postId) await db.update(qaPosts).set({ likesCount: sql`likesCount - 1` }).where(eq(qaPosts.id, postId));
    else if (answerId) await db.update(qaAnswers).set({ likesCount: sql`likesCount - 1` }).where(eq(qaAnswers.id, answerId));
    return { liked: false };
  } else {
    await db.insert(qaLikes).values({ userId, postId, answerId });
    if (postId) await db.update(qaPosts).set({ likesCount: sql`likesCount + 1` }).where(eq(qaPosts.id, postId));
    else if (answerId) await db.update(qaAnswers).set({ likesCount: sql`likesCount + 1` }).where(eq(qaAnswers.id, answerId));
    return { liked: true };
  }
}

export async function getUserLikes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qaLikes).where(eq(qaLikes.userId, userId));
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function getMemberProgressSummary(userId: number) {
  const completed = await getCompletedLessonCount(userId);
  const totalPoints = await getTotalPoints(userId);
  const userMilestones = await getUserMilestones(userId);
  const bonuses = await getLoginBonusHistory(userId, 7);
  const streak = bonuses.length > 0 ? bonuses[0].streakDay : 0;
  return { completed, totalPoints, milestones: userMilestones, streak };
}

// ─── Cohorts (Archive System) ────────────────────────────────────────────────
export async function getAllCohorts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
}

export async function getCohortById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
  return result[0];
}

export async function createCohort(data: InsertCohort) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(cohorts).values(data);
  const result = await db.select().from(cohorts).orderBy(desc(cohorts.createdAt)).limit(1);
  return result[0];
}

export async function updateCohort(id: number, data: Partial<InsertCohort & { isArchived: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cohorts).set(data).where(eq(cohorts.id, id));
}

export async function deleteCohort(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cohorts).where(eq(cohorts.id, id));
}

export async function verifyCohortPassword(id: number, password: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
  if (!result[0]) return false;
  if (!result[0].archivePassword) return true; // no password set = open access
  return result[0].archivePassword === password;
}
