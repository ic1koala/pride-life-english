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

// ─── Mock Data Generator for DB-less mode ──────────────────────────────────────
const LESSON_THEMES = [
  "Introducing Yourself with Pride","Talking About Your Identity","Expressing Feelings in English",
  "Coming Out Stories","Finding Your Community","Navigating Relationships","Workplace English & Inclusion",
  "Travel & Adventure","Health & Wellness","Dreams & Aspirations","Advocacy & Allyship","Celebrating Diversity",
];
const JOURNALING_PROMPTS = [
  "How would you describe yourself to someone new?","What does Pride mean to you personally?",
  "Describe a moment when you felt truly accepted.","How would you come out to a friend in English?",
  "What English phrase would you use to express joy?","Describe your ideal supportive community.",
  "How would you advocate for yourself at work?","What adventure would you love to have?",
  "How do you practice self-care?","What are your dreams for the future?",
  "How would you explain allyship to someone?","What makes you feel celebrated?",
];
const SPEAKING_PROMPTS = [
  "I'd say... I'd describe myself as...","My identity is... I identify as...",
  "I feel... When I'm happy, I say...","I'd want them to know... I'd say...",
  "I'm so excited because... I feel...","My community is... We support each other by...",
  "In my workplace, I'd like... I would say...","I'd love to visit... because...",
  "I take care of myself by... I recommend...","My dream is to... I hope to...",
  "An ally is someone who... I believe...","I celebrate by... I feel proud when...",
];

function generateMockLessons() {
  const mock: any[] = [];
  let orderIndex = 1;
  for (let week = 1; week <= 24; week++) {
    const themeIdx = (week - 1) % LESSON_THEMES.length;
    for (let day = 1; day <= 4; day++) {
      mock.push({
        id: orderIndex,
        weekNumber: week,
        dayNumber: day,
        title: `Week ${week} Day ${day}: ${LESSON_THEMES[themeIdx]}`,
        description: `Lesson ${(week - 1) * 4 + day} of 96. Explore ${LESSON_THEMES[themeIdx]} with confidence and pride.`,
        videoUrl: "",
        journalingPrompt: `${JOURNALING_PROMPTS[themeIdx]} (Week ${week}, Day ${day})`,
        speakingPrompt: `Practice saying: "${SPEAKING_PROMPTS[themeIdx]}"`,
        orderIndex,
        publishedAt: new Date(),
      });
      orderIndex++;
    }
  }
  return mock;
}

const mockUser = {
  id: 999,
  openId: "mock_test_user_id",
  name: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$xuA7oGngwlhuWp1mRbNnlORM7zbvmGozv4U55EEs6R0kDgMz3l946", // "password123"
  role: "admin",
  subscriptionStatus: "active",
  stripeCustomerId: "cus_mock_123",
  stripeSubscriptionId: "sub_mock_123",
  subscriptionCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (user.openId === "mock_test_user_id") return;
  try {
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
  } catch (e) {
    console.warn("[Database] Failed to upsert user, falling back:", e);
  }
}

export async function getUserByOpenId(openId: string) {
  if (openId === "mock_test_user_id") return mockUser;
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get user by openId, falling back:", e);
    return undefined;
  }
}

export async function getUserByEmail(email: string) {
  if (email === "test@example.com") return mockUser;
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get user by email, falling back:", e);
    return undefined;
  }
}

export async function getUserById(id: number) {
  if (id === 999) return mockUser;
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get user by id, falling back:", e);
    return undefined;
  }
}

export async function createUser(data: InsertUser) {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(users).values(data);
    return getUserByEmail(data.email!);
  } catch (e) {
    console.warn("[Database] Failed to create user, falling back:", e);
    return undefined;
  }
}

export async function updateUserSubscription(userId: number, data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing";
  subscriptionCurrentPeriodEnd?: Date | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(users).set(data).where(eq(users.id, userId));
  } catch (e) {
    console.warn("[Database] Failed to update subscription, falling back:", e);
  }
}

export async function updateUserSubscriptionByStripeCustomerId(stripeCustomerId: string, data: {
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing";
  subscriptionCurrentPeriodEnd?: Date | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(users).set(data).where(eq(users.stripeCustomerId, stripeCustomerId));
  } catch (e) {
    console.warn("[Database] Failed to update subscription by Stripe Customer ID:", e);
  }
}

export async function getAllUsers() {
  try {
    const db = await getDb();
    if (!db) return [mockUser];
    return db.select().from(users).orderBy(desc(users.createdAt));
  } catch (e) {
    console.warn("[Database] Failed to get all users, falling back:", e);
    return [mockUser];
  }
}

export async function adminUpdateUserSubscription(userId: number, status: "active" | "inactive" | "past_due" | "canceled" | "trialing") {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, userId));
  } catch (e) {
    console.warn("[Database] Failed to update user subscription as admin:", e);
  }
}

// ─── Lessons ─────────────────────────────────────────────────────────────────
export async function getAllLessons() {
  try {
    const db = await getDb();
    if (!db) return generateMockLessons();
    return await db.select().from(lessons).orderBy(lessons.orderIndex);
  } catch (e) {
    console.warn("[Database] Failed to get lessons, returning mock:", e);
    return generateMockLessons();
  }
}

export async function getLessonById(id: number) {
  try {
    const db = await getDb();
    if (!db) return generateMockLessons().find(l => l.id === id);
    const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return result[0] || generateMockLessons().find(l => l.id === id);
  } catch (e) {
    console.warn("[Database] Failed to get lesson by id, returning mock:", e);
    return generateMockLessons().find(l => l.id === id);
  }
}

export async function getLessonsByWeek(weekNumber: number) {
  try {
    const db = await getDb();
    if (!db) return generateMockLessons().filter(l => l.weekNumber === weekNumber);
    return await db.select().from(lessons).where(eq(lessons.weekNumber, weekNumber)).orderBy(lessons.dayNumber);
  } catch (e) {
    console.warn("[Database] Failed to get lessons by week, returning mock:", e);
    return generateMockLessons().filter(l => l.weekNumber === weekNumber);
  }
}

export async function upsertLesson(data: InsertLesson) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(lessons).values(data).onDuplicateKeyUpdate({ set: data });
  } catch (e) {
    console.warn("[Database] Failed to upsert lesson:", e);
  }
}

export async function getAllLessonsAdmin() {
  try {
    const db = await getDb();
    if (!db) return generateMockLessons();
    return db.select().from(lessons).orderBy(lessons.weekNumber, lessons.dayNumber);
  } catch (e) {
    console.warn("[Database] Failed to get lessons as admin, returning mock:", e);
    return generateMockLessons();
  }
}

export async function deleteLessonById(id: number) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(lessons).where(eq(lessons.id, id));
  } catch (e) {
    console.warn("[Database] Failed to delete lesson:", e);
  }
}

export async function toggleLessonPublish(id: number, publish: boolean) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(lessons).set({ publishedAt: publish ? new Date() : null }).where(eq(lessons.id, id));
  } catch (e) {
    console.warn("[Database] Failed to toggle lesson publish:", e);
  }
}

export async function updateLesson(id: number, data: Partial<InsertLesson>) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(lessons).set(data).where(eq(lessons.id, id));
  } catch (e) {
    console.warn("[Database] Failed to update lesson:", e);
  }
}

export async function createLesson(data: InsertLesson) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(lessons).values(data);
    const result = await db.select().from(lessons).where(and(eq(lessons.weekNumber, data.weekNumber), eq(lessons.dayNumber, data.dayNumber))).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to create lesson:", e);
    return undefined;
  }
}

// ─── Member Progress ──────────────────────────────────────────────────────────
export async function getUserProgress(userId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(memberProgress).where(eq(memberProgress.userId, userId)).orderBy(memberProgress.lessonId);
  } catch (e) {
    console.warn("[Database] Failed to get user progress, returning empty:", e);
    return [];
  }
}

export async function getLessonProgress(userId: number, lessonId: number) {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(memberProgress).where(and(eq(memberProgress.userId, userId), eq(memberProgress.lessonId, lessonId))).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get lesson progress, returning empty:", e);
    return undefined;
  }
}

export async function upsertLessonProgress(data: InsertMemberProgress) {
  try {
    const db = await getDb();
    if (!db) return;
    const existing = await getLessonProgress(data.userId, data.lessonId);
    if (existing) {
      await db.update(memberProgress).set(data).where(and(eq(memberProgress.userId, data.userId), eq(memberProgress.lessonId, data.lessonId)));
    } else {
      await db.insert(memberProgress).values(data);
    }
  } catch (e) {
    console.warn("[Database] Failed to upsert lesson progress:", e);
  }
}

export async function getCompletedLessonCount(userId: number) {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.select({ count: sql<number>`count(*)` }).from(memberProgress).where(and(eq(memberProgress.userId, userId), isNotNull(memberProgress.completedAt)));
    return Number(result[0]?.count ?? 0);
  } catch (e) {
    console.warn("[Database] Failed to get completed lesson count, returning 0:", e);
    return 0;
  }
}

// ─── Login Bonuses ────────────────────────────────────────────────────────────
export async function getTodayLoginBonus(userId: number, today: string) {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(loginBonuses).where(and(eq(loginBonuses.userId, userId), eq(loginBonuses.loginDate, today))).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get today login bonus, returning empty:", e);
    return undefined;
  }
}

export async function getLoginBonusHistory(userId: number, limit = 30) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(loginBonuses).where(eq(loginBonuses.userId, userId)).orderBy(desc(loginBonuses.loginDate)).limit(limit);
  } catch (e) {
    console.warn("[Database] Failed to get login bonus history, returning empty:", e);
    return [];
  }
}

export async function recordLoginBonus(data: InsertLoginBonus) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(loginBonuses).values(data);
  } catch (e) {
    console.warn("[Database] Failed to record login bonus:", e);
  }
}

export async function getTotalPoints(userId: number) {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.select({ total: sql<number>`sum(pointsEarned)` }).from(loginBonuses).where(eq(loginBonuses.userId, userId));
    return Number(result[0]?.total ?? 0);
  } catch (e) {
    console.warn("[Database] Failed to get total points, returning 0:", e);
    return 0;
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export async function getUserMilestones(userId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.earnedAt);
  } catch (e) {
    console.warn("[Database] Failed to get user milestones, returning empty:", e);
    return [];
  }
}

export async function awardMilestone(userId: number, badgeType: string, badgeLabel: string) {
  try {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(milestones).where(and(eq(milestones.userId, userId), eq(milestones.badgeType, badgeType))).limit(1);
    if (existing.length > 0) return;
    await db.insert(milestones).values({ userId, badgeType, badgeLabel });
  } catch (e) {
    console.warn("[Database] Failed to award milestone:", e);
  }
}

// ─── Q&A Posts ────────────────────────────────────────────────────────────────
export async function getQaPosts(limit = 20, offset = 0) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select({ id: qaPosts.id, userId: qaPosts.userId, title: qaPosts.title, body: qaPosts.body, likesCount: qaPosts.likesCount, answersCount: qaPosts.answersCount, isPinned: qaPosts.isPinned, createdAt: qaPosts.createdAt, updatedAt: qaPosts.updatedAt, authorName: users.name }).from(qaPosts).leftJoin(users, eq(qaPosts.userId, users.id)).orderBy(desc(qaPosts.isPinned), desc(qaPosts.createdAt)).limit(limit).offset(offset);
  } catch (e) {
    console.warn("[Database] Failed to get Q&A posts, returning empty:", e);
    return [];
  }
}

export async function getQaPostById(id: number) {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select({ id: qaPosts.id, userId: qaPosts.userId, title: qaPosts.title, body: qaPosts.body, likesCount: qaPosts.likesCount, answersCount: qaPosts.answersCount, isPinned: qaPosts.isPinned, createdAt: qaPosts.createdAt, updatedAt: qaPosts.updatedAt, authorName: users.name }).from(qaPosts).leftJoin(users, eq(qaPosts.userId, users.id)).where(eq(qaPosts.id, id)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get Q&A post by id, returning empty:", e);
    return undefined;
  }
}

export async function createQaPost(data: InsertQaPost) {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(qaPosts).values(data);
    const result = await db.select().from(qaPosts).where(and(eq(qaPosts.userId, data.userId), eq(qaPosts.title, data.title))).orderBy(desc(qaPosts.createdAt)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to create Q&A post:", e);
    return undefined;
  }
}

export async function getQaAnswers(postId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select({ id: qaAnswers.id, postId: qaAnswers.postId, userId: qaAnswers.userId, body: qaAnswers.body, likesCount: qaAnswers.likesCount, isBestAnswer: qaAnswers.isBestAnswer, createdAt: qaAnswers.createdAt, updatedAt: qaAnswers.updatedAt, authorName: users.name }).from(qaAnswers).leftJoin(users, eq(qaAnswers.userId, users.id)).where(eq(qaAnswers.postId, postId)).orderBy(desc(qaAnswers.isBestAnswer), qaAnswers.createdAt);
  } catch (e) {
    console.warn("[Database] Failed to get Q&A answers, returning empty:", e);
    return [];
  }
}

export async function createQaAnswer(data: InsertQaAnswer) {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(qaAnswers).values(data);
    await db.update(qaPosts).set({ answersCount: sql`answersCount + 1` }).where(eq(qaPosts.id, data.postId));
    const result = await db.select().from(qaAnswers).where(eq(qaAnswers.postId, data.postId)).orderBy(desc(qaAnswers.createdAt)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to create Q&A answer:", e);
    return undefined;
  }
}

export async function markBestAnswer(answerId: number, postId: number) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(qaAnswers).set({ isBestAnswer: false }).where(eq(qaAnswers.postId, postId));
    await db.update(qaAnswers).set({ isBestAnswer: true }).where(eq(qaAnswers.id, answerId));
  } catch (e) {
    console.warn("[Database] Failed to mark best answer:", e);
  }
}

export async function toggleLike(userId: number, postId?: number, answerId?: number) {
  try {
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
  } catch (e) {
    console.warn("[Database] Failed to toggle like:", e);
    return { liked: false };
  }
}

export async function getUserLikes(userId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(qaLikes).where(eq(qaLikes.userId, userId));
  } catch (e) {
    console.warn("[Database] Failed to get user likes, returning empty:", e);
    return [];
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: InsertNotification) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(notifications).values(data);
  } catch (e) {
    console.warn("[Database] Failed to create notification:", e);
  }
}

export async function getUserNotifications(userId: number, limit = 20) {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  } catch (e) {
    console.warn("[Database] Failed to get user notifications, returning empty:", e);
    return [];
  }
}

export async function markNotificationsRead(userId: number) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  } catch (e) {
    console.warn("[Database] Failed to mark notifications as read:", e);
  }
}

export async function getUnreadNotificationCount(userId: number) {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count ?? 0);
  } catch (e) {
    console.warn("[Database] Failed to get unread notification count, returning 0:", e);
    return 0;
  }
}

export async function getMemberProgressSummary(userId: number) {
  try {
    const completed = await getCompletedLessonCount(userId);
    const totalPoints = await getTotalPoints(userId);
    const userMilestones = await getUserMilestones(userId);
    const bonuses = await getLoginBonusHistory(userId, 7);
    const streak = bonuses.length > 0 ? bonuses[0].streakDay : 0;
    return { completed, totalPoints, milestones: userMilestones, streak };
  } catch (e) {
    console.warn("[Database] Failed to get member progress summary, returning default:", e);
    return { completed: 0, totalPoints: 0, milestones: [], streak: 0 };
  }
}

// ─── Cohorts (Archive System) ────────────────────────────────────────────────
export async function getAllCohorts() {
  try {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
  } catch (e) {
    console.warn("[Database] Failed to get cohorts, returning empty:", e);
    return [];
  }
}

export async function getCohortById(id: number) {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to get cohort by id, returning empty:", e);
    return undefined;
  }
}

export async function createCohort(data: InsertCohort) {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(cohorts).values(data);
    const result = await db.select().from(cohorts).orderBy(desc(cohorts.createdAt)).limit(1);
    return result[0];
  } catch (e) {
    console.warn("[Database] Failed to create cohort:", e);
    return undefined;
  }
}

export async function updateCohort(id: number, data: Partial<InsertCohort & { isArchived: boolean }>) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(cohorts).set(data).where(eq(cohorts.id, id));
  } catch (e) {
    console.warn("[Database] Failed to update cohort:", e);
  }
}

export async function deleteCohort(id: number) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(cohorts).where(eq(cohorts.id, id));
  } catch (e) {
    console.warn("[Database] Failed to delete cohort:", e);
  }
}

export async function verifyCohortPassword(id: number, password: string) {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
    if (!result[0]) return false;
    if (!result[0].archivePassword) return true; // no password set = open access
    return result[0].archivePassword === password;
  } catch (e) {
    console.warn("[Database] Failed to verify cohort password:", e);
    return false;
  }
}
