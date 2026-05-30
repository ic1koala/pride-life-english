import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./trpc";

async function notifyOwner(input: { title: string; content: string }): Promise<boolean> {
  console.log(`[System Notification] Title: ${input.title} | Content: ${input.content}`);
  return true;
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
