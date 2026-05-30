import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { memberProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  adminUpdateUserSubscription, awardMilestone, createCohort, createLesson, createNotification, createQaAnswer,
  createQaPost, createUser, deleteCohort, deleteLessonById, getAllCohorts, getAllLessons, getAllLessonsAdmin, getAllUsers,
  getCohortById, getCompletedLessonCount, getLessonById, getLessonProgress, getLessonsByWeek,
  getLoginBonusHistory, getMemberProgressSummary, getQaAnswers, getQaPostById, getQaPosts,
  getTodayLoginBonus, getTotalPoints, getUnreadNotificationCount, getUserByEmail,
  getUserById, getUserLikes, getUserMilestones, getUserNotifications, getUserProgress,
  markBestAnswer, markNotificationsRead, recordLoginBonus, toggleLessonPublish, toggleLike,
  updateCohort, updateLesson, updateUserSubscription, updateUserSubscriptionByStripeCustomerId,
  upsertLessonProgress, verifyCohortPassword,
} from "./db";
import { storagePut } from "./storage";
import { PRIDE_LIFE_PRODUCT } from "./products";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_51MockDummyKeyForLocalPreviewModeOnly";
const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });

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

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    profile: memberProcedure.query(async ({ ctx }) => {
      const { getUserById, getUserMilestones } = await import("./db");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const userMilestones = await getUserMilestones(ctx.user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        streakFreezesActive: user.streakFreezesActive,
        suspensionsUsedCount: user.suspensionsUsedCount,
        activeCourse: (user as any).activeCourse ?? "star",
        semesterStartDate: (user as any).semesterStartDate ?? user.createdAt,
        semesterNumber: (user as any).semesterNumber ?? 1,
        avatarUrl: (user as any).avatarUrl ?? null,
        milestones: userMilestones.map(m => m.badgeType),
      };
    }),
    updateAvatar: memberProcedure
      .input(z.object({ avatarUrl: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const { updateUserAvatar } = await import("./db");
        return updateUserAvatar(ctx.user.id, input.avatarUrl);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const user = await createUser({ openId, name: input.name, email: input.email, passwordHash, loginMethod: "email" });
        return { success: true, userId: user?.id };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        if (user.subscriptionStatus !== "active" && user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "subscription_required" });
        }
        // Use the SDK's session format so authenticateRequest can verify it
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.signSession({ openId: user.openId, appId: process.env.VITE_APP_ID ?? "pride-life-english", name: user.name ?? user.email ?? "Member" }, { expiresInMs: 30 * 24 * 60 * 60 * 1000 });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),
  }),

  stripe: router({
    createCheckout: publicProcedure
      .input(z.object({ email: z.string().email(), name: z.string(), origin: z.string() }))
      .mutation(async ({ input }) => {
        let customerId: string | undefined;
        const existing = await getUserByEmail(input.email);
        if (existing?.stripeCustomerId) {
          customerId = existing.stripeCustomerId;
        } else {
          const customer = await stripe.customers.create({ email: input.email, name: input.name });
          customerId = customer.id;
          if (existing) await updateUserSubscription(existing.id, { stripeCustomerId: customerId });
        }
        const prices = await stripe.prices.list({ active: true, limit: 10 });
        let priceId = prices.data.find((p: any) => p.unit_amount === PRIDE_LIFE_PRODUCT.price.unit_amount && p.currency === PRIDE_LIFE_PRODUCT.price.currency)?.id;
        if (!priceId) {
          const products = await stripe.products.list({ active: true, limit: 5 });
          let productId = products.data.find((p: any) => p.name === PRIDE_LIFE_PRODUCT.name)?.id;
          if (!productId) {
            const product = await stripe.products.create({ name: PRIDE_LIFE_PRODUCT.name, description: PRIDE_LIFE_PRODUCT.description });
            productId = product.id;
          }
          const price = await stripe.prices.create({ product: productId, currency: PRIDE_LIFE_PRODUCT.price.currency, unit_amount: PRIDE_LIFE_PRODUCT.price.unit_amount, recurring: PRIDE_LIFE_PRODUCT.price.recurring });
          priceId = price.id;
        }
        const session = await stripe.checkout.sessions.create({
          customer: customerId, mode: "subscription", payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${input.origin}/dashboard?payment=success`,
          cancel_url: `${input.origin}/login?payment=canceled`,
          allow_promotion_codes: true,
          metadata: { customer_email: input.email, customer_name: input.name },
          client_reference_id: existing?.id?.toString() ?? "",
        });
        return { url: session.url };
      }),
    getPortalUrl: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user?.stripeCustomerId) throw new TRPCError({ code: "NOT_FOUND", message: "No Stripe customer found" });
        const session = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${input.origin}/dashboard` });
        return { url: session.url };
      }),
  }),

  lessons: router({
    list: memberProcedure.query(async () => getAllLessons()),
    byId: memberProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const lesson = await getLessonById(input.id);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });
      return lesson;
    }),
    byWeek: memberProcedure.input(z.object({ week: z.number() })).query(async ({ input }) => getLessonsByWeek(input.week)),
    toggleTask: memberProcedure
      .input(z.object({ lessonId: z.number(), taskKey: z.string(), points: z.number(), completed: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { toggleLessonTask } = await import("./db");
        return toggleLessonTask(ctx.user.id, input.lessonId, input.taskKey, input.points, input.completed);
      }),
    taskProgress: memberProcedure
      .input(z.object({ lessonId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getLessonTaskProgress } = await import("./db");
        return getLessonTaskProgress(ctx.user.id, input.lessonId);
      }),
  }),

  progress: router({
    mine: memberProcedure.query(async ({ ctx }) => getUserProgress(ctx.user.id)),
    summary: memberProcedure.query(async ({ ctx }) => {
      const completed = await getCompletedLessonCount(ctx.user.id);
      const totalPoints = await getTotalPoints(ctx.user.id);
      const userMilestones = await getUserMilestones(ctx.user.id);
      return { completed, totalPoints, milestones: userMilestones, totalLessons: 120 };
    }),
    lessonProgress: memberProcedure.input(z.object({ lessonId: z.number() })).query(async ({ ctx, input }) => getLessonProgress(ctx.user.id, input.lessonId)),
    saveJournal: memberProcedure
      .input(z.object({ lessonId: z.number(), journalEntry: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await upsertLessonProgress({ userId: ctx.user.id, lessonId: input.lessonId, journalEntry: input.journalEntry });
        return { success: true };
      }),
    completeLesson: memberProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await upsertLessonProgress({ userId: ctx.user.id, lessonId: input.lessonId, completedAt: new Date() });
        const completed = await getCompletedLessonCount(ctx.user.id);
        const milestoneMap: Record<number, [string, string]> = {
          1: ["first_lesson", "🌈 First Step"],
          5: ["five_lessons", "⭐ Rising Star"],
          10: ["ten_lessons", "🔥 On Fire"],
          25: ["quarter_done", "💜 Quarter Pride"],
          50: ["halfway", "🏳️‍🌈 Halfway Hero"],
          75: ["three_quarters", "✨ Almost There"],
          96: ["term_1_complete", "1st Half Badge"],
          100: ["century", "💎 Century Club"],
          192: ["term_2_complete", "2nd Half Badge"],
        };
        if (milestoneMap[completed]) {
          const [type, label] = milestoneMap[completed];
          await awardMilestone(ctx.user.id, type, label);
          await createNotification({
            userId: ctx.user.id,
            type: "milestone",
            title: "New Badge Earned!",
            message: `Congratulations! You earned the "${label}" badge!`,
          });
          if (type === "term_2_complete") {
            await awardMilestone(ctx.user.id, "course_complete", "Complete Badge");
            await awardMilestone(ctx.user.id, "master_badge", "Master Badge");
            await createNotification({
              userId: ctx.user.id,
              type: "milestone",
              title: "🎓 コース完全完走！ 🎓",
              message: "おめでとうございます！1年間の全カリキュラムを完走し、Completeバッジを獲得しました！",
            });
            await createNotification({
              userId: ctx.user.id,
              type: "milestone",
              title: "👑 英語マスター達成！ 👑",
              message: "素晴らしい！全てのレッスンと課題をクリアし、究極のMasterバッジを獲得しました！",
            });
          }
        }
        return { success: true, completed };
      }),
  }),

  speaking: router({
    uploadAudio: memberProcedure
      .input(z.object({ lessonId: z.number(), audioBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.audioBase64, "base64");
        const key = `speaking/${ctx.user.id}/${input.lessonId}_${Date.now()}.webm`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { key, url };
      }),
    transcribeAndFeedback: memberProcedure
      .input(z.object({ lessonId: z.number(), audioKey: z.string(), audioUrl: z.string(), speakingPrompt: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const transcriptionResult = await transcribeAudio({ audioUrl: input.audioUrl, language: "en", prompt: input.speakingPrompt });
        const text = (transcriptionResult as any).text ?? "";
        const feedbackResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a warm, encouraging English coach for LGBT9+ learners in the Pride Life English course. Your feedback is always supportive, specific, and empowering. Provide feedback in 3 parts: 1. What they did well (pronunciation, expression, confidence) 2. One specific improvement tip 3. An encouraging closing message that celebrates their identity and pride. Keep it under 150 words. Be genuine and inclusive.` },
            { role: "user", content: String(`Speaking prompt: "${input.speakingPrompt}"\n\nStudent's response (transcribed): "${text}"\n\nPlease provide personalized coaching feedback.`) },
          ],
        });
        const rawContent = feedbackResponse.choices[0]?.message?.content;
        const feedback = (typeof rawContent === "string" ? rawContent : null) ?? "Great effort! Keep practicing with pride!";
        await upsertLessonProgress({ userId: ctx.user.id, lessonId: input.lessonId, speakingTranscription: text, speakingFeedback: feedback, speakingAudioUrl: input.audioUrl });
        return { transcription: text, feedback };
      }),
  }),

  loginBonus: router({
    claim: memberProcedure.mutation(async ({ ctx }) => {
      const today = new Date().toISOString().split("T")[0];
      const existing = await getTodayLoginBonus(ctx.user.id, today);
      if (existing) return { alreadyClaimed: true, bonus: existing, streak: existing.streakDay, pointsEarned: existing.pointsEarned, totalPoints: await getTotalPoints(ctx.user.id) };
      const history = await getLoginBonusHistory(ctx.user.id, 2);
      let streak = 1;
      let streakFreezeUsed = false;
      if (history.length > 0) {
        const lastDate = new Date(history[0].loginDate);
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const lastDateStr = lastDate.toISOString().split("T")[0];
        
        if (lastDateStr === yesterdayStr) {
          streak = history[0].streakDay + 1;
        } else {
          // They missed yesterday! Check if they have a Streak Freeze.
          const { getUserById, getDb } = await import("./db");
          const user = await getUserById(ctx.user.id);
          if (user && user.streakFreezesActive > 0) {
            streakFreezeUsed = true;
            streak = history[0].streakDay + 1; // Preserve streak
            
            // Decrement active freezes by 1
            const dbObj = await getDb();
            if (dbObj) {
              const { users: schemaUsers } = await import("../drizzle/schema");
              await dbObj.update(schemaUsers).set({ streakFreezesActive: user.streakFreezesActive - 1 }).where(eq(schemaUsers.id, ctx.user.id));
            } else {
              // Mock fallback
              const dbMock = await import("./db");
              (dbMock as any).mockStreakFreezesActive = Math.max(0, (dbMock as any).mockStreakFreezesActive - 1);
            }
          }
        }
      }
      let pointsEarned = 10;
      if (streak === 7) {
        pointsEarned = 50;
      } else if (streak > 1) {
        pointsEarned = 10 + (streak - 1) * 5;
      }
      await recordLoginBonus({ userId: ctx.user.id, loginDate: today, streakDay: streak, pointsEarned });
      
      const message = streakFreezeUsed 
        ? `Day ${streak} streak! You missed yesterday, but your Streak Freeze was used to preserve your streak! You earned ${pointsEarned} points. ❄️🌈`
        : `Day ${streak} streak! You earned ${pointsEarned} points today. Keep it up! 🌈`;
        
      await createNotification({ userId: ctx.user.id, type: "login_bonus", title: "Login Bonus!", message });
      const totalPoints = await getTotalPoints(ctx.user.id);
      return { alreadyClaimed: false, streak, pointsEarned, totalPoints, streakFreezeUsed };
    }),
    history: memberProcedure.query(async ({ ctx }) => getLoginBonusHistory(ctx.user.id, 30)),
    totalPoints: memberProcedure.query(async ({ ctx }) => getTotalPoints(ctx.user.id)),
  }),

  qa: router({
    posts: memberProcedure.input(z.object({ limit: z.number().default(20), offset: z.number().default(0) })).query(async ({ input }) => getQaPosts(input.limit, input.offset)),
    post: memberProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const post = await getQaPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      return post;
    }),
    answers: memberProcedure.input(z.object({ postId: z.number() })).query(async ({ input }) => getQaAnswers(input.postId)),
    createPost: memberProcedure
      .input(z.object({ title: z.string().min(1).max(500), body: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => createQaPost({ userId: ctx.user.id, title: input.title, body: input.body })),
    createAnswer: memberProcedure
      .input(z.object({ postId: z.number(), body: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => createQaAnswer({ postId: input.postId, userId: ctx.user.id, body: input.body })),
    markBestAnswer: memberProcedure
      .input(z.object({ answerId: z.number(), postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await getQaPostById(input.postId);
        if (!post || (post.userId !== ctx.user.id && ctx.user.role !== "admin")) throw new TRPCError({ code: "FORBIDDEN" });
        await markBestAnswer(input.answerId, input.postId);
        return { success: true };
      }),
    toggleLike: memberProcedure
      .input(z.object({ postId: z.number().optional(), answerId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => toggleLike(ctx.user.id, input.postId, input.answerId)),
    myLikes: memberProcedure.query(async ({ ctx }) => getUserLikes(ctx.user.id)),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => getUserNotifications(ctx.user.id)),
    unreadCount: protectedProcedure.query(async ({ ctx }) => getUnreadNotificationCount(ctx.user.id)),
    markRead: protectedProcedure.mutation(async ({ ctx }) => { await markNotificationsRead(ctx.user.id); return { success: true }; }),
  }),

  admin: router({
    members: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllUsers();
    }),
    memberProgress: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getMemberProgressSummary(input.userId);
    }),
    leaderboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const usersList = await getAllUsers();
      const leaderboardData = await Promise.all(usersList.map(async (u) => {
        const progress = await getMemberProgressSummary(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          subscriptionStatus: u.subscriptionStatus,
          role: u.role,
          createdAt: u.createdAt,
          avatarUrl: (u as any).avatarUrl ?? null,
          ...progress
        };
      }));
      return leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
    }),
    sendGlobalNotification: protectedProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["login_bonus", "new_lesson", "payment_failed", "milestone", "general"])
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const usersList = await getAllUsers();
        let count = 0;
        for (const user of usersList) {
          if (user.role !== "admin") {
            await createNotification({
              userId: user.id,
              type: input.type,
              title: input.title,
              message: input.message
            });
            count++;
          }
        }
        return { success: true, count };
      }),
    updateSubscription: protectedProcedure
      .input(z.object({ userId: z.number(), status: z.enum(["active", "inactive", "past_due", "canceled", "trialing"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await adminUpdateUserSubscription(input.userId, input.status);
        if (input.status === "inactive" || input.status === "canceled") {
          await createNotification({ userId: input.userId, type: "payment_failed", title: "Subscription Update", message: "Your subscription status has been updated. Please contact support if you have questions." });
        }
        return { success: true };
      }),
    seedLessons: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { upsertLesson } = await import("./db");
      let orderIndex = 1;
      for (let week = 1; week <= 24; week++) {
        const themeIdx = (week - 1) % LESSON_THEMES.length;
        for (let day = 1; day <= 4; day++) {
          await upsertLesson({
            weekNumber: week, dayNumber: day,
            title: `Week ${week} Day ${day}: ${LESSON_THEMES[themeIdx]}`,
            description: `Lesson ${(week - 1) * 4 + day} of 96. Explore ${LESSON_THEMES[themeIdx]} with confidence and pride.`,
            videoUrl: "", journalingPrompt: `${JOURNALING_PROMPTS[themeIdx]} (Week ${week}, Day ${day})`,
            speakingPrompt: `Practice saying: "${SPEAKING_PROMPTS[themeIdx]}"`,
            orderIndex, publishedAt: new Date(),
          });
          orderIndex++;
        }
      }
      return { seeded: 96 };
    }),
    listLessons: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllLessonsAdmin();
    }),
    createLesson: protectedProcedure
      .input(z.object({
        weekNumber: z.number().min(1).max(24),
        dayNumber: z.number().min(1).max(4),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        journalingPrompt: z.string().optional(),
        speakingPrompt: z.string().optional(),
        publish: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const orderIndex = (input.weekNumber - 1) * 4 + input.dayNumber;
        const lesson = await createLesson({
          weekNumber: input.weekNumber,
          dayNumber: input.dayNumber,
          title: input.title,
          description: input.description ?? null,
          videoUrl: input.videoUrl ?? null,
          journalingPrompt: input.journalingPrompt ?? null,
          speakingPrompt: input.speakingPrompt ?? null,
          orderIndex,
          publishedAt: input.publish ? new Date() : null,
        });
        return { success: true, lesson };
      }),
    updateLesson: protectedProcedure
      .input(z.object({
        id: z.number(),
        weekNumber: z.number().min(1).max(24).optional(),
        dayNumber: z.number().min(1).max(4).optional(),
        title: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        journalingPrompt: z.string().optional(),
        speakingPrompt: z.string().optional(),
        publish: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, publish, ...fields } = input;
        const updateData: Record<string, any> = {};
        if (fields.weekNumber !== undefined) updateData.weekNumber = fields.weekNumber;
        if (fields.dayNumber !== undefined) updateData.dayNumber = fields.dayNumber;
        if (fields.title !== undefined) updateData.title = fields.title;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.videoUrl !== undefined) updateData.videoUrl = fields.videoUrl;
        if (fields.journalingPrompt !== undefined) updateData.journalingPrompt = fields.journalingPrompt;
        if (fields.speakingPrompt !== undefined) updateData.speakingPrompt = fields.speakingPrompt;
        if (fields.weekNumber !== undefined || fields.dayNumber !== undefined) {
          // Fetch existing lesson to get current week/day for proper orderIndex
          const existing = await getLessonById(id);
          const w = fields.weekNumber ?? existing?.weekNumber ?? 1;
          const d = fields.dayNumber ?? existing?.dayNumber ?? 1;
          updateData.orderIndex = (w - 1) * 4 + d;
        }
        if (publish !== undefined) updateData.publishedAt = publish ? new Date() : null;
        await updateLesson(id, updateData);
        return { success: true };
      }),
    deleteLesson: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteLessonById(input.id);
        return { success: true };
      }),
    togglePublish: protectedProcedure
      .input(z.object({ id: z.number(), publish: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await toggleLessonPublish(input.id, input.publish);
        return { success: true };
      }),
  }),

  streak: router({
    buyFreeze: memberProcedure.mutation(async ({ ctx }) => {
      const { buyStreakFreeze } = await import("./db");
      return buyStreakFreeze(ctx.user.id);
    }),
  }),

  subscription: router({
    suspend: memberProcedure.mutation(async () => {
      throw new TRPCError({ code: "FORBIDDEN", message: "学期内の途中休会は廃止されました。詳しくは設定画面をご確認ください。" });
    }),
    resume: memberProcedure.mutation(async () => {
      throw new TRPCError({ code: "FORBIDDEN", message: "学期内の途中休会は廃止されました。詳しくは設定画面をご確認ください。" });
    }),
    switchCourse: memberProcedure
      .input(z.object({ course: z.enum(["star", "knowledge"]) }))
      .mutation(async ({ ctx, input }) => {
        const { switchCourse } = await import("./db");
        return switchCourse(ctx.user.id, input.course);
      }),
    semesterStatus: memberProcedure.query(async ({ ctx }) => {
      const { getUserById, canRequestSemesterAction } = await import("./db");
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const semesterStart = (user as any).semesterStartDate ?? user.createdAt;
      const { inWindow, windowStart, windowEnd } = canRequestSemesterAction(semesterStart);
      return {
        semesterNumber: (user as any).semesterNumber ?? 1,
        semesterStartDate: semesterStart,
        inWindow,
        windowStart,
        windowEnd,
        activeCourse: (user as any).activeCourse ?? "star",
      };
    }),
    requestRest: memberProcedure.mutation(async ({ ctx }) => {
      const { requestSemesterRest } = await import("./db");
      const result = await requestSemesterRest(ctx.user.id);
      
      // Also attempt to set cancel_at_period_end on Stripe
      const { getUserById } = await import("./db");
      const user = await getUserById(ctx.user.id);
      if (user?.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
        } catch (e) {
          console.warn("[Stripe] Failed to set cancel_at_period_end:", e);
        }
      }
      
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
