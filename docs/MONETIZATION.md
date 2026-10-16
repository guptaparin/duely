# Duely — Fiscal Architecture (Monetization Engine)

Duely earns money in three ways, layered so that revenue grows with customer value:

1. **Tiered SaaS subscriptions** for recurring revenue.
2. **Transactional platform fees** on money collected through Duely, so revenue scales with how much customers bill.
3. **Usage-based AI credits** as the upgrade lever between tiers.

## Pricing tiers

| | **Starter** | **Pro** | **Agency** |
|---|---|---|---|
| Price | ₹0 | **₹499 / month** | **₹1,499 / month** |
| Unpaid invoices at once | 5 | Unlimited | Unlimited |
| AI follow-up drafts / month | 10 | 200 | 1,000 |
| Auto-chase (daily automatic reminders) | — | ✓ | ✓ |
| Client late-payment risk scores | — | ✓ | ✓ |
| Platform fee on payments collected | 2% | 0.5% | 0% |

All of this is enforced in code:

- Plan definitions live in `src/lib/plans.ts`.
- Invoice limits are checked in `createInvoiceAction`.
- AI credits are checked in `src/lib/credits.ts`.
- The fee is recorded per invoice in `src/lib/fulfil.ts`.
- Upgrades are real Razorpay checkouts (`/api/billing/*`).

## How each revenue stream works

**1. Subscriptions (recurring).** Pro and Agency are billed in 30-day periods through Razorpay.
- Paying extends `plan_renews_at` by 30 days and resets AI credits.
- A daily job moves lapsed accounts back to Starter.
- Next step: Razorpay Subscriptions for automatic card and UPI AutoPay renewals.

**2. Transaction fees (scales with customer revenue).** When a client pays an invoice through Duely, the platform fee for the owner's plan is calculated and stored on the invoice (`platform_fee`).
- In production this is collected with Razorpay Route: the freelancer's share settles to their linked account and Duely keeps the fee.
- On Starter, the 2% fee alone can make Duely profitable on free users who collect real money.

**3. AI credits (usage lever).** Every AI action uses one credit: drafting a reminder or turning a sentence into an invoice.
- Free users hit the 10-credit ceiling quickly once they have a few late clients. That is exactly the moment they feel the value.
- The upgrade prompt appears in context, at the point of need.

## Why the tiers convert

- **Free → Pro trigger:** a 6th unpaid invoice, an 11th reminder, or wanting reminders to go out automatically.
- **Fee arbitrage:** Starter charges 2%, Pro 0.5%. Anyone collecting more than about ₹33,000 a month saves money by upgrading, since 1.5% of ₹33,267 is ₹499. Pro pays for itself for most working freelancers.
- **Pro → Agency:** at about ₹2,00,000 a month collected, the 0.5% fee (₹1,000) plus the extra credits make the ₹1,000 step up obviously worth it.

## Unit economics (illustrative)

These figures are illustrative, not measured.

| Per Pro customer / month | Value |
|---|---|
| Subscription | ₹499 |
| Platform fee (0.5% × ₹80,000 collected) | ₹400 |
| **Gross revenue** | **₹899** |
| AI cost (200 drafts × ~700 tokens on Groq) | < ₹15 |
| Hosting (Vercel + Supabase, amortised) | < ₹10 |
| **Gross margin** | **~97%** |

Razorpay's processing charge is passed through to the payer or freelancer at its standard rate and is not counted as Duely revenue.

## Growth loops that feed revenue

1. **Viral payment pages.** Every invoice puts "Invoicing by Duely" in front of a business that pays freelancers, and those businesses are often agencies themselves.
2. **Data compounding.** The longer a freelancer uses Duely, the more accurate their client risk scores become. That makes the product harder to leave.
3. **Expansion revenue.** Transaction fees grow automatically as customers' businesses grow, with no extra sales effort.
