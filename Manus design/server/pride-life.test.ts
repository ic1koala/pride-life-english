import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  getAllUsers: vi.fn(),
  getAllLessons: vi.fn(),
  getLessonById: vi.fn(),
  getLessonsByWeek: vi.fn(),
  getUserProgress: vi.fn(),
  getLessonProgress: vi.fn(),
  getCompletedLessonCount: vi.fn(),
  upsertLessonProgress: vi.fn(),
  getTodayLoginBonus: vi.fn(),
  getLoginBonusHistory: vi.fn(),
  recordLoginBonus: vi.fn(),
  getTotalPoints: vi.fn(),
  getUserMilestones: vi.fn(),
  awardMilestone: vi.fn(),
  getQaPosts: vi.fn(),
  getQaPostById: vi.fn(),
  createQaPost: vi.fn(),
  getQaAnswers: vi.fn(),
  createQaAnswer: vi.fn(),
  markBestAnswer: vi.fn(),
  toggleLike: vi.fn(),
  getUserLikes: vi.fn(),
  getUserNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationsRead: vi.fn(),
  createNotification: vi.fn(),
  getMemberProgressSummary: vi.fn(),
  updateUserSubscription: vi.fn(),
  updateUserSubscriptionByStripeCustomerId: vi.fn(),
  adminUpdateUserSubscription: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertLesson: vi.fn(),
  getAllLessonsAdmin: vi.fn(),
  createLesson: vi.fn(),
  updateLesson: vi.fn(),
  deleteLessonById: vi.fn(),
  toggleLessonPublish: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "/manus-storage/test-key" }),
}));

vi.mock("./products", () => ({
  PRIDE_LIFE_PRODUCT: {
    name: "Pride Life English",
    description: "6-month English course",
    price: { currency: "jpy", unit_amount: 9800, recurring: { interval: "month" } },
  },
}));

vi.mock("stripe", () => {
  const mockStripe = {
    customers: { create: vi.fn(), list: vi.fn() },
    prices: { list: vi.fn().mockResolvedValue({ data: [] }), create: vi.fn() },
    products: { list: vi.fn().mockResolvedValue({ data: [] }), create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
  };
  return { default: vi.fn().mockReturnValue(mockStripe) };
});

vi.mock("./_core/sdk", () => ({
  sdk: {
    signSession: vi.fn().mockResolvedValue("mock-session-token"),
    verifySession: vi.fn(),
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Great job! Keep practicing with pride!" } }],
  }),
}));

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({ text: "I am proud of who I am." }),
}));

import * as db from "./db";
import bcrypt from "bcryptjs";

// ─── Context helpers ──────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "email_test_123",
    name: "Test Member",
    email: "test@example.com",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: "active",
    subscriptionCurrentPeriodEnd: null,
    ...overrides,
  } as AuthenticatedUser;
}

function makeAdminUser(): AuthenticatedUser {
  return makeUser({ role: "admin", id: 99, openId: "admin_open_id" });
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: makeUser(),
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toContain(COOKIE_NAME);
  });
});

describe("auth.register", () => {
  beforeEach(() => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createUser).mockResolvedValue({ id: 1, email: "new@example.com" } as any);
  });

  it("registers a new user successfully", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.register({
      name: "New Member",
      email: "new@example.com",
      password: "SecurePass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate email", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(makeUser() as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.register({ name: "Dup", email: "test@example.com", password: "SecurePass123" })
    ).rejects.toThrow("Email already registered");
  });
});

describe("auth.login", () => {
  it("rejects invalid credentials", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      ...makeUser(),
      passwordHash: await bcrypt.hash("correct-password", 12),
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.login({ email: "test@example.com", password: "wrong-password" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("rejects inactive subscription", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      ...makeUser({ subscriptionStatus: "inactive" }),
      passwordHash: await bcrypt.hash("password123", 12),
    } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.login({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow("subscription_required");
  });
});

// ─── Login Bonus Tests ────────────────────────────────────────────────────────
describe("loginBonus.claim", () => {
  const today = new Date().toISOString().split("T")[0];

  it("awards first-day bonus (10 points)", async () => {
    vi.mocked(db.getTodayLoginBonus).mockResolvedValue(undefined);
    vi.mocked(db.getLoginBonusHistory).mockResolvedValue([]);
    vi.mocked(db.recordLoginBonus).mockResolvedValue(undefined);
    vi.mocked(db.getTotalPoints).mockResolvedValue(10);
    vi.mocked(db.createNotification).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.loginBonus.claim();
    expect(result.alreadyClaimed).toBe(false);
    expect(result.streak).toBe(1);
    expect(result.pointsEarned).toBe(10);
  });

  it("returns alreadyClaimed when bonus already exists today", async () => {
    const existingBonus = { id: 1, userId: 1, loginDate: today, streakDay: 3, pointsEarned: 20, createdAt: new Date() };
    vi.mocked(db.getTodayLoginBonus).mockResolvedValue(existingBonus as any);
    vi.mocked(db.getTotalPoints).mockResolvedValue(60);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.loginBonus.claim();
    expect(result.alreadyClaimed).toBe(true);
    expect(result.streak).toBe(3);
  });

  it("awards 50 points for 7-day streak", async () => {
    vi.mocked(db.getTodayLoginBonus).mockResolvedValue(undefined);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    vi.mocked(db.getLoginBonusHistory).mockResolvedValue([
      { id: 1, userId: 1, loginDate: yesterday.toISOString().split("T")[0], streakDay: 6, pointsEarned: 20, createdAt: new Date() },
    ] as any);
    vi.mocked(db.recordLoginBonus).mockResolvedValue(undefined);
    vi.mocked(db.getTotalPoints).mockResolvedValue(200);
    vi.mocked(db.createNotification).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.loginBonus.claim();
    expect(result.streak).toBe(7);
    expect(result.pointsEarned).toBe(50);
  });
});

// ─── Progress Tests ───────────────────────────────────────────────────────────
describe("progress.completeLesson", () => {
  it("marks a lesson complete and awards first-lesson milestone", async () => {
    vi.mocked(db.upsertLessonProgress).mockResolvedValue(undefined);
    vi.mocked(db.getCompletedLessonCount).mockResolvedValue(1);
    vi.mocked(db.awardMilestone).mockResolvedValue(undefined);
    vi.mocked(db.createNotification).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.progress.completeLesson({ lessonId: 1 });
    expect(result.success).toBe(true);
    expect(result.completed).toBe(1);
    expect(vi.mocked(db.awardMilestone)).toHaveBeenCalledWith(1, "first_lesson", "🌈 First Step");
  });

  it("awards halfway milestone at 50 lessons", async () => {
    vi.mocked(db.upsertLessonProgress).mockResolvedValue(undefined);
    vi.mocked(db.getCompletedLessonCount).mockResolvedValue(50);
    vi.mocked(db.awardMilestone).mockResolvedValue(undefined);
    vi.mocked(db.createNotification).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await caller.progress.completeLesson({ lessonId: 50 });
    expect(vi.mocked(db.awardMilestone)).toHaveBeenCalledWith(1, "halfway", "🏳️‍🌈 Halfway Hero");
  });
});

// ─── Q&A Tests ────────────────────────────────────────────────────────────────
describe("qa.createPost", () => {
  it("creates a Q&A post", async () => {
    const mockPost = { id: 1, userId: 1, title: "How do I say...", body: "Question body", likesCount: 0, answersCount: 0, isPinned: false, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.createQaPost).mockResolvedValue(mockPost as any);

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.qa.createPost({ title: "How do I say...", body: "Question body" });
    expect(result?.title).toBe("How do I say...");
  });
});

// ─── Admin Tests ──────────────────────────────────────────────────────────────
describe("admin.members", () => {
  it("returns members list for admin", async () => {
    vi.mocked(db.getAllUsers).mockResolvedValue([makeUser() as any]);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.members();
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.admin.members()).rejects.toThrow();
  });
});

describe("admin.updateSubscription", () => {
  it("admin can revoke member access", async () => {
    vi.mocked(db.adminUpdateUserSubscription).mockResolvedValue(undefined);
    vi.mocked(db.createNotification).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.updateSubscription({ userId: 1, status: "inactive" });
    expect(result.success).toBe(true);
    expect(vi.mocked(db.adminUpdateUserSubscription)).toHaveBeenCalledWith(1, "inactive");
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("returns unread count", async () => {
    vi.mocked(db.getUnreadNotificationCount).mockResolvedValue(3);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const count = await caller.notifications.unreadCount();
    expect(count).toBe(3);
  });

  it("marks notifications as read", async () => {
    vi.mocked(db.markNotificationsRead).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.notifications.markRead();
    expect(result.success).toBe(true);
  });
});

// ─── Admin Lesson CRUD Tests ─────────────────────────────────────────────────
describe("admin.listLessons", () => {
  it("returns all lessons for admin", async () => {
    vi.mocked(db.getAllLessonsAdmin).mockResolvedValue([
      { id: 1, weekNumber: 1, dayNumber: 1, title: "Test Lesson", description: null, videoUrl: null, journalingPrompt: null, speakingPrompt: null, orderIndex: 1, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ] as any);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.listLessons();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Lesson");
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.admin.listLessons()).rejects.toThrow();
  });
});

describe("admin.createLesson", () => {
  it("creates a lesson for admin", async () => {
    vi.mocked(db.createLesson).mockResolvedValue({
      id: 10, weekNumber: 2, dayNumber: 3, title: "New Lesson", description: null,
      videoUrl: null, journalingPrompt: null, speakingPrompt: null, orderIndex: 8,
      publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.createLesson({
      weekNumber: 2, dayNumber: 3, title: "New Lesson", publish: false,
    });
    expect(result.success).toBe(true);
    expect(result.lesson?.weekNumber).toBe(2);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.admin.createLesson({ weekNumber: 1, dayNumber: 1, title: "X" })
    ).rejects.toThrow();
  });
});

describe("admin.updateLesson", () => {
  it("updates a lesson for admin", async () => {
    vi.mocked(db.updateLesson).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.updateLesson({ id: 1, title: "Updated Title" });
    expect(result.success).toBe(true);
    expect(vi.mocked(db.updateLesson)).toHaveBeenCalledWith(1, expect.objectContaining({ title: "Updated Title" }));
  });
});

describe("admin.deleteLesson", () => {
  it("deletes a lesson for admin", async () => {
    vi.mocked(db.deleteLessonById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.deleteLesson({ id: 5 });
    expect(result.success).toBe(true);
    expect(vi.mocked(db.deleteLessonById)).toHaveBeenCalledWith(5);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.admin.deleteLesson({ id: 5 })).rejects.toThrow();
  });
});

describe("admin.togglePublish", () => {
  it("publishes a lesson", async () => {
    vi.mocked(db.toggleLessonPublish).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.togglePublish({ id: 3, publish: true });
    expect(result.success).toBe(true);
    expect(vi.mocked(db.toggleLessonPublish)).toHaveBeenCalledWith(3, true);
  });

  it("unpublishes a lesson", async () => {
    vi.mocked(db.toggleLessonPublish).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.togglePublish({ id: 3, publish: false });
    expect(result.success).toBe(true);
    expect(vi.mocked(db.toggleLessonPublish)).toHaveBeenCalledWith(3, false);
  });
});
