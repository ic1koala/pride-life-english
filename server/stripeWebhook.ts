import express from "express";
import Stripe from "stripe";
import { createNotification, getUserByEmail, updateUserSubscriptionByStripeCustomerId } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Test event bypass
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const email = session.metadata?.customer_email ?? session.customer_details?.email ?? "";
          if (customerId && subscriptionId) {
            await updateUserSubscriptionByStripeCustomerId(customerId, {
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: "active",
            });
            // Also update by email if customer ID not yet linked
            if (email) {
              const user = await getUserByEmail(email);
              if (user && !user.stripeCustomerId) {
                const { updateUserSubscription } = await import("./db");
                await updateUserSubscription(user.id, {
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  subscriptionStatus: "active",
                });
              }
              if (user) {
                await createNotification({
                  userId: user.id,
                  type: "general",
                  title: "Welcome to Pride Life English! 🌈",
                  message: "Your subscription is now active. Start your first lesson and begin your journey!",
                });
              }
            }
          }
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const subscriptionId = (invoice as any).subscription as string;
          if (customerId) {
            await updateUserSubscriptionByStripeCustomerId(customerId, {
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: "active",
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          if (customerId) {
            await updateUserSubscriptionByStripeCustomerId(customerId, {
              subscriptionStatus: "past_due",
            });
            // Notify user
            const { getDb } = await import("./db");
            const { users } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const db = await getDb();
            if (db) {
              const result = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
              if (result[0]) {
                await createNotification({
                  userId: result[0].id,
                  type: "payment_failed",
                  title: "Payment Failed",
                  message: "Your payment could not be processed. Please update your payment method to maintain access.",
                });
              }
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const status = subscription.status as "active" | "inactive" | "past_due" | "canceled" | "trialing";
          const periodEnd = new Date(((subscription as any).current_period_end ?? 0) * 1000);
          await updateUserSubscriptionByStripeCustomerId(customerId, {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: status,
            subscriptionCurrentPeriodEnd: periodEnd,
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          await updateUserSubscriptionByStripeCustomerId(customerId, {
            subscriptionStatus: "canceled",
          });
          // Notify user
          const { getDb } = await import("./db");
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const db = await getDb();
          if (db) {
            const result = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
            if (result[0]) {
              await createNotification({
                userId: result[0].id,
                type: "payment_failed",
                title: "Subscription Canceled",
                message: "Your subscription has been canceled. We hope to see you again soon! 🌈",
              });
            }
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error("[Stripe Webhook] Handler error:", err);
    }

    res.json({ received: true });
  }
);
