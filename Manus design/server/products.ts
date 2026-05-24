// Pride Life English — Stripe Products & Prices
// These are created dynamically via Stripe API on first checkout

export const PRIDE_LIFE_PRODUCT = {
  name: "Pride Life English — 6-Month Membership",
  description:
    "Full access to the Pride Life English 6-month English course for LGBT9+ learners. Includes video lessons, journaling, AI speaking practice, and community Q&A.",
  // Monthly recurring price in JPY (adjust as needed)
  price: {
    currency: "jpy",
    unit_amount: 9800,
    recurring: { interval: "month" as const },
  },
};
