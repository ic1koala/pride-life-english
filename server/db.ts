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
  memberTaskProgress,
  InsertMemberTaskProgress,
  pointTransactions,
  InsertPointTransaction,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// In-memory mock storage for DB-less mode
let mockUserPoints = 120;
let mockStreakFreezesActive = 0;
let mockSuspensionsUsedCount = 0;
let mockSubscriptionStatus = "active";
let mockActiveCourse: "star" | "knowledge" = "star";
let mockAvatarUrl: string | null = null;
const mockTaskProgressStore: Array<{ userId: number, lessonId: number, taskKey: string, pointsEarned: number }> = [];
const mockMilestonesStore: Array<{ userId: number, badgeType: string, badgeLabel: string }> = [];

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
  role: "admin" as "admin" | "user",
  loginMethod: null,
  get subscriptionStatus() { return mockSubscriptionStatus as "active" | "inactive" | "past_due" | "canceled" | "trialing" | "suspended"; },
  stripeCustomerId: "cus_mock_123",
  stripeSubscriptionId: "sub_mock_123",
  subscriptionCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  get streakFreezesActive() { return mockStreakFreezesActive; },
  get suspensionsUsedCount() { return mockSuspensionsUsedCount; },
  get activeCourse() { return mockActiveCourse; },
  get avatarUrl() { return mockAvatarUrl; },
  semesterStartDate: new Date(),
  semesterNumber: 1,
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
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing" | "suspended";
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
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled" | "trialing" | "suspended";
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
    if (!db) {
      const taskPointsSum = mockTaskProgressStore
        .filter(t => t.userId === userId)
        .reduce((sum, curr) => sum + curr.pointsEarned, 0);
      return mockUserPoints + taskPointsSum;
    }
    const loginResult = await db.select({ total: sql<number>`sum(pointsEarned)` }).from(loginBonuses).where(eq(loginBonuses.userId, userId));
    const taskResult = await db.select({ total: sql<number>`sum(pointsEarned)` }).from(memberTaskProgress).where(eq(memberTaskProgress.userId, userId));
    const transResult = await db.select({ total: sql<number>`sum(amount)` }).from(pointTransactions).where(eq(pointTransactions.userId, userId));
    
    const loginTotal = Number(loginResult[0]?.total ?? 0);
    const taskTotal = Number(taskResult[0]?.total ?? 0);
    const transTotal = Number(transResult[0]?.total ?? 0);
    
    return loginTotal + taskTotal + transTotal;
  } catch (e) {
    console.warn("[Database] Failed to get total points, returning 0:", e);
    return 0;
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export async function getUserMilestones(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) {
        return mockMilestonesStore.filter(m => m.userId === userId) as any[];
      }
      return [];
    }
    return db.select().from(milestones).where(eq(milestones.userId, userId)).orderBy(milestones.earnedAt);
  } catch (e) {
    console.warn("[Database] Failed to get user milestones, returning empty:", e);
    return [];
  }
}

export async function awardMilestone(userId: number, badgeType: string, badgeLabel: string) {
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) {
        const existing = mockMilestonesStore.find(m => m.userId === userId && m.badgeType === badgeType);
        if (!existing) {
          mockMilestonesStore.push({ userId, badgeType, badgeLabel });
        }
      }
      return;
    }
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

export async function isCohortArchived(cohortId: number) {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
    return !!result[0]?.isArchived;
  } catch (e) {
    console.warn("[Database] Failed to check if cohort is archived:", e);
    return false;
  }
}

// ─── Lesson Tasks & Transactions Helpers ─────────────────────────────────────
export async function recordPointTransaction(userId: number, amount: number, type: string) {
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) {
        mockUserPoints += amount;
      }
      return;
    }
    await db.insert(pointTransactions).values({ userId, amount, type });
  } catch (e) {
    console.warn("[Database] Failed to record point transaction:", e);
  }
}

export async function buyStreakFreeze(userId: number) {
  const currentPoints = await getTotalPoints(userId);
  if (currentPoints < 500) {
    throw new Error("ポイントが不足しています (500ポイント必要です)");
  }
  
  await recordPointTransaction(userId, -500, "streak_freeze_purchase");
  
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) {
        mockStreakFreezesActive += 1;
      }
      return { success: true, streakFreezesActive: mockStreakFreezesActive };
    }
    const user = await getUserById(userId);
    if (!user) throw new Error("ユーザーが見つかりません");
    const currentFreezes = user.streakFreezesActive ?? 0;
    await db.update(users).set({ streakFreezesActive: currentFreezes + 1 }).where(eq(users.id, userId));
    return { success: true, streakFreezesActive: currentFreezes + 1 };
  } catch (e) {
    console.warn("[Database] Failed to buy streak freeze:", e);
    throw e;
  }
}

export async function getLessonTaskProgress(userId: number, lessonId: number) {
  try {
    const db = await getDb();
    if (!db) {
      return mockTaskProgressStore.filter(t => t.userId === userId && t.lessonId === lessonId);
    }
    return db.select().from(memberTaskProgress).where(and(eq(memberTaskProgress.userId, userId), eq(memberTaskProgress.lessonId, lessonId)));
  } catch (e) {
    console.warn("[Database] Failed to get lesson task progress:", e);
    return [];
  }
}

export async function toggleLessonTask(userId: number, lessonId: number, taskKey: string, points: number, completed: boolean) {
  try {
    const db = await getDb();
    if (!db) {
      if (completed) {
        const exists = mockTaskProgressStore.some(t => t.userId === userId && t.lessonId === lessonId && t.taskKey === taskKey);
        if (!exists) {
          mockTaskProgressStore.push({ userId, lessonId, taskKey, pointsEarned: points });
        }
      } else {
        const idx = mockTaskProgressStore.findIndex(t => t.userId === userId && t.lessonId === lessonId && t.taskKey === taskKey);
        if (idx !== -1) mockTaskProgressStore.splice(idx, 1);
      }
      return { success: true };
    }
    
    if (completed) {
      const existing = await db.select().from(memberTaskProgress).where(and(
        eq(memberTaskProgress.userId, userId),
        eq(memberTaskProgress.lessonId, lessonId),
        eq(memberTaskProgress.taskKey, taskKey)
      )).limit(1);
      if (existing.length === 0) {
        await db.insert(memberTaskProgress).values({ userId, lessonId, taskKey, pointsEarned: points });
      }
    } else {
      await db.delete(memberTaskProgress).where(and(
        eq(memberTaskProgress.userId, userId),
        eq(memberTaskProgress.lessonId, lessonId),
        eq(memberTaskProgress.taskKey, taskKey)
      ));
    }
    return { success: true };
  } catch (e) {
    console.warn("[Database] Failed to toggle lesson task:", e);
    throw e;
  }
}

// DEPRECATED: 学期内の途中休会は廃止されました (rulebook.md §3)
export async function suspendUserSubscription(_userId: number) {
  throw new Error("学期内の途中休会は廃止されました。詳しくは設定画面をご確認ください。");
}

// DEPRECATED: 学期内の途中休会は廃止されました (rulebook.md §3)
export async function resumeUserSubscription(_userId: number) {
  throw new Error("学期内の途中休会は廃止されました。詳しくは設定画面をご確認ください。");
}

// ─── Course System (コース制度) ───────────────────────────────────────────────
export async function switchCourse(userId: number, course: "star" | "knowledge") {
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) mockActiveCourse = course;
      return { success: true, activeCourse: course };
    }
    await db.update(users).set({ activeCourse: course } as any).where(eq(users.id, userId));
    return { success: true, activeCourse: course };
  } catch (e) {
    console.warn("[Database] Failed to switch course:", e);
    throw e;
  }
}

export async function updateUserAvatar(userId: number, avatarUrl: string | null) {
  try {
    const db = await getDb();
    if (!db) {
      if (userId === 999) mockAvatarUrl = avatarUrl;
      return { success: true, avatarUrl };
    }
    await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
    return { success: true, avatarUrl };
  } catch (e) {
    console.warn("[Database] Failed to update user avatar:", e);
    throw e;
  }
}

// ─── Semester System (学期契約制度) ───────────────────────────────────────────
export function canRequestSemesterAction(semesterStartDate: Date | null): { inWindow: boolean; windowStart: Date; windowEnd: Date } {
  const start = semesterStartDate ?? new Date();
  // 申請ウィンドウ: 5ヶ月目の20日 ～ 6ヶ月目末日
  const windowStart = new Date(start);
  windowStart.setMonth(windowStart.getMonth() + 4); // 5ヶ月目 = +4
  windowStart.setDate(20);
  const windowEnd = new Date(start);
  windowEnd.setMonth(windowEnd.getMonth() + 6); // 6ヶ月目末
  windowEnd.setDate(0); // 月の最終日
  windowEnd.setHours(23, 59, 59, 999);
  const now = new Date();
  return { inWindow: now >= windowStart && now <= windowEnd, windowStart, windowEnd };
}

export async function requestSemesterRest(userId: number) {
  try {
    const user = await getUserById(userId);
    if (!user) throw new Error("ユーザーが見つかりません");
    const { inWindow } = canRequestSemesterAction(user.semesterStartDate ?? null);
    if (!inWindow) throw new Error("申請ウィンドウ期間外です。5ヶ月目20日〜6ヶ月目末日にのみ申請できます。");
    // Mark subscription to cancel at period end (next semester won't auto-renew)
    const db = await getDb();
    if (!db) return { success: true, message: "次学期の休会申請が完了しました" };
    await db.update(users).set({ subscriptionStatus: "canceled" as any }).where(eq(users.id, userId));
    return { success: true, message: "次学期の休会申請が完了しました。過去のアーカイブは引き続きアクセス可能です。" };
  } catch (e) {
    console.warn("[Database] Failed to request semester rest:", e);
    throw e;
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

// ─── Admin Line Chart Point History & Broadcast Management ───────────────────
export async function getAdminPointHistory() {
  const db = await getDb();
  const usersList = await getAllUsers();

  // Calculate last 7 dates in M/D format
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  const historyData = await Promise.all(
    usersList.map(async (u) => {
      const pointsByDate: Record<string, number> = {};
      dates.forEach((d) => {
        pointsByDate[d] = 0;
      });

      if (!db) {
        // Mock points history for all 7 days
        let seed = u.id;
        dates.forEach((d, index) => {
          const val = Math.floor((Math.sin(seed + index) + 1) * 20); // 0 to 40
          pointsByDate[d] = val > 5 ? val : 0;
        });
      } else {
        // Fetch real points from DB
        try {
          const bonuses = await db.select().from(loginBonuses).where(eq(loginBonuses.userId, u.id));
          const tasks = await db.select().from(memberTaskProgress).where(eq(memberTaskProgress.userId, u.id));
          const trans = await db.select().from(pointTransactions).where(eq(pointTransactions.userId, u.id));

          bonuses.forEach((b) => {
            const d = new Date(b.createdAt);
            const mD = `${d.getMonth() + 1}/${d.getDate()}`;
            if (pointsByDate[mD] !== undefined) {
              pointsByDate[mD] += b.pointsEarned;
            }
          });

          tasks.forEach((t) => {
            const d = new Date(t.completedAt);
            const mD = `${d.getMonth() + 1}/${d.getDate()}`;
            if (pointsByDate[mD] !== undefined) {
              pointsByDate[mD] += t.pointsEarned;
            }
          });

          trans.forEach((tr) => {
            const d = new Date(tr.createdAt);
            const mD = `${d.getMonth() + 1}/${d.getDate()}`;
            if (pointsByDate[mD] !== undefined && tr.amount > 0) {
              pointsByDate[mD] += tr.amount;
            }
          });
        } catch (e) {
          console.warn(`[Database] Failed to get points history for user ${u.id}:`, e);
        }
      }

      return {
        id: u.id,
        name: u.name ?? `Student ${u.id}`,
        role: u.role,
        pointsByDate,
      };
    })
  );

  // Calculate Weekly Average for non-admins for each date
  const weeklyAverage: Record<string, number> = {};
  dates.forEach((d) => {
    let sum = 0;
    let count = 0;
    historyData.forEach((h) => {
      if (h.role !== "admin") {
        sum += h.pointsByDate[d] || 0;
        count++;
      }
    });
    weeklyAverage[d] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  });

  return {
    dates,
    members: historyData.filter((h) => h.role !== "admin"),
    weeklyAverage,
  };
}

export async function getAdminBroadcasts() {
  const db = await getDb();
  if (!db) {
    // Return high-quality mock broadcasts
    return [
      {
        id: 1,
        title: "【重要】第1期（Term 1）修了バッジの贈呈について",
        message: "受講生の皆様、第1期レッスン96日間の継続受講お疲れ様でした！マイページにて1st Halfバッジが獲得可能になりましたので、ぜひご確認ください。",
        type: "general",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        count: 5,
      },
      {
        id: 2,
        title: "🔥 ストリーク応援！3日以上継続でボーナス付与",
        message: "毎日ログインして英語の学習習慣を身につけましょう！ストリーク日数が増えると、継続ログインボーナス（ポイント）が手に入ります。",
        type: "login_bonus",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        count: 5,
      },
    ];
  }

  try {
    const allNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const grouped: Record<string, {
      id: number;
      title: string;
      message: string;
      type: string;
      createdAt: string;
      count: number;
    }> = {};

    allNotifs.forEach((n) => {
      const key = `${n.type}-${n.title}-${n.message.substring(0, 100)}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt.toISOString(),
          count: 1,
        };
      } else {
        grouped[key].count++;
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.warn("[Database] Failed to get admin broadcasts, returning empty:", e);
    return [];
  }
}

export async function deleteAdminBroadcast(title: string, message: string, type: string) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(notifications).where(
      and(
        eq(notifications.title, title),
        eq(notifications.message, message),
        eq(notifications.type, type as any)
      )
    );
  } catch (e) {
    console.warn("[Database] Failed to delete admin broadcast:", e);
  }
}

export async function updateAdminBroadcast(
  oldTitle: string,
  oldMessage: string,
  oldType: string,
  newTitle: string,
  newMessage: string,
  newType: string
) {
  try {
    const db = await getDb();
    if (!db) return;

    // 1. Delete matching old rows
    await db.delete(notifications).where(
      and(
        eq(notifications.title, oldTitle),
        eq(notifications.message, oldMessage),
        eq(notifications.type, oldType as any)
      )
    );

    // 2. Fetch all non-admin users to insert new rows
    const usersList = await getAllUsers();
    for (const user of usersList) {
      if (user.role !== "admin") {
        await db.insert(notifications).values({
          userId: user.id,
          title: newTitle,
          message: newMessage,
          type: newType as any,
          isRead: false,
        });
      }
    }
  } catch (e) {
    console.warn("[Database] Failed to update admin broadcast:", e);
  }
}
