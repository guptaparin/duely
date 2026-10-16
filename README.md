# Duely — AI invoice chaser for freelancers & agencies

Duely sends invoices with a one-tap UPI / card payment link, then uses AI to write (and on paid plans, send) follow-ups to late clients in the right tone — friendly, firm, then final. A dashboard shows who owes you, how late they usually pay, and the cash you can expect in the next 30 days.

> Built for **Galuxium Nexus V2**. Live demo: `https://<your-app>.vercel.app` · Demo video: `<link>`

---

## What it does

| Workflow | How it works |
|---|---|
| **Invoice in one sentence** | Type *"logo 15k + 3 banners at 2k, 18% GST, due in 10 days"*. Groq (Llama 3.3 70B) returns structured line items, tax and due date, validated with Zod. |
| **Hosted payment page** | Every invoice has an unguessable public link (`/pay/<uuid>`). The client pays through Razorpay Checkout (UPI, cards, netbanking, wallets). |
| **Verified payments** | The server creates the Razorpay order, verifies the HMAC signature on return, and a webhook backs it up. Fulfilment is idempotent, so the invoice is marked paid exactly once. |
| **AI follow-ups** | One click drafts a reminder whose tone escalates with lateness. Send it by SMTP, open it in your email app, or copy it to WhatsApp. Every draft is logged. |
| **Auto-chase (Pro)** | A daily Vercel Cron job drafts and sends follow-ups for overdue invoices, at most once every 3 days per invoice. |
| **Client risk score (Pro)** | Each client is scored 0–100 from their own payment history: average days late, invoices overdue now, and how late. |
| **Subscriptions** | Upgrading to Pro or Agency is a real Razorpay checkout. Plans unlock limits, AI credits and lower transaction fees. |

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Components, Server Actions), TypeScript | One codebase for UI and API; server-first rendering keeps secrets off the client |
| Styling | Tailwind CSS v4, self-hosted Geist + Instrument Serif | No runtime font calls; fast first paint |
| Database & auth | **Supabase** (Postgres + Auth) with Row Level Security | Every table is locked to `auth.uid()`; the database enforces isolation |
| AI | **Groq** (`llama-3.3-70b-versatile`) with JSON mode + Zod validation | Sub-second drafts; outputs are schema-checked before use |
| Payments | **Razorpay** Orders + Checkout + Webhooks | Native UPI for the Indian market; HMAC-SHA256 signature verification |
| Email (optional) | Nodemailer over SMTP (e.g. Gmail App Password) | Free; falls back to `mailto:` when not configured |
| Hosting & jobs | **Vercel** + Vercel Cron | Edge network, zero-config deploys, daily auto-chase |

Everything above runs on free tiers.

## Architecture

```
                 ┌──────────────────────── Vercel ────────────────────────┐
 Freelancer ───▶ │  Next.js App Router                                     │
 (browser)       │   • /dashboard/*  Server Components (RLS client)        │
                 │   • Server Actions: clients, invoices, settings         │
                 │   • /api/ai/*        ──▶ Groq (JSON mode, Zod-checked)   │
                 │   • /api/billing/*   ──▶ Razorpay Orders                 │
                 │   • /api/reminders/send ──▶ SMTP                          │
                 │                                                         │
 Client ───────▶ │   • /pay/[token]     public page (service role, by token)│
 (pays by UPI)   │   • /api/pay/order   create order  ──▶ Razorpay          │
                 │   • /api/pay/verify  HMAC verify ──▶ fulfilOrder()      │
                 │                                                         │
 Razorpay ─────▶ │   • /api/webhooks/razorpay  HMAC verify ──▶ fulfilOrder()│
 Vercel Cron ──▶ │   • /api/cron/reminders  (Bearer CRON_SECRET)           │
                 └───────────────┬─────────────────────────────────────────┘
                                 ▼
                       Supabase Postgres + Auth (RLS on every table)
```

**Security notes**

- **Row Level Security** on every table. A signed-in user can only read or write rows where `user_id = auth.uid()`.
- Column-level grants stop users from changing their own `plan`, `ai_credits_used` or `plan_renews_at` from the browser. Only the server (service role) can, after a verified payment.
- **The public payment page** looks invoices up by a random UUID token, never by ID. It exposes no client email and no owner details beyond the business name.
- **Payments are trusted only after verification.** The checkout signature (`order_id|payment_id`) and the webhook signature (raw body) are both checked with HMAC-SHA256 and a timing-safe comparison. `fulfilOrder()` is idempotent, so the browser callback and the webhook can both fire safely.
- **AI output is never trusted blindly.** It is parsed with Zod, and the payment link is re-inserted if the model drops it. A failed generation refunds the user's credit.
- **The cron endpoint** requires `Authorization: Bearer $CRON_SECRET`. Vercel sends this header automatically.

## Database schema

Full SQL: [`supabase/schema.sql`](supabase/schema.sql)

```
profiles  (id PK→auth.users, full_name, business_name, plan[free|pro|agency],
           plan_renews_at, auto_chase, ai_credits_used, ai_period_start)
clients   (id, user_id→auth.users, name, email, company)
invoices  (id, user_id, client_id→clients, number UNIQUE per user, currency,
           items jsonb[{description,quantity,rate}], subtotal, tax_rate, total,
           issue_date, due_date, status[draft|sent|paid|void], notes,
           public_token uuid UNIQUE, razorpay_order_id, razorpay_payment_id,
           platform_fee, paid_at)
reminders (id, user_id, invoice_id→invoices, tone[friendly|firm|final],
           subject, body, channel[draft|email|manual|auto], sent_at)
payments  (id, user_id, invoice_id?, kind[invoice|subscription], plan, amount,
           currency, razorpay_order_id UNIQUE, razorpay_payment_id UNIQUE,
           status[created|captured|failed])
```

A trigger (`on_auth_user_created`) creates a `profiles` row for every new sign-up.

## Run it locally

**Prerequisites:** Node 20+, plus free accounts on Supabase, Groq and Razorpay (test mode).

```bash
git clone https://github.com/<you>/duely.git
cd duely
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run dev                     # http://localhost:3000
```

1. **Supabase:** create a project. Then go to **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - Copy the **Project URL**, the **anon** key and the **service_role** key from **Project Settings → API**.
   - For a smooth demo, turn off **Authentication → Sign In / Providers → Email → Confirm email**. Users can then sign in right after signing up.
2. **Groq:** create an API key at console.groq.com and set it as `GROQ_API_KEY`.
3. **Razorpay:** switch the dashboard to **Test Mode**, then go to **Account & Settings → API Keys → Generate**.
   - Put the key ID in both `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`, and the secret in `RAZORPAY_KEY_SECRET`.
4. Optional: set the `SMTP_*` values to a Gmail address and a Google **App Password**. This lets Duely send emails itself.

**Test payments:** use UPI `success@razorpay`, or card `4100 2800 0000 1007` with any future expiry and any CVV.

## Deploy (Vercel, free)

1. Push to GitHub, then on vercel.com click **Add New → Project** and import the repo.
2. Add every variable from `.env.example` under **Environment Variables**.
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.
   - Set `CRON_SECRET` to a long random string.
3. Deploy. Then:
   - In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to your Vercel URL.
   - In Razorpay test mode, go to **Webhooks** and add `https://<app>/api/webhooks/razorpay` with the events `payment.captured` and `payment.failed`. Put its secret in `RAZORPAY_WEBHOOK_SECRET` and redeploy.

`vercel.json` schedules the auto-chase job daily at 09:00 IST.

## Project structure

```
src/
  app/
    page.tsx                  landing + pricing
    login/ signup/ auth/      Supabase auth
    dashboard/                overview, invoices, clients, billing, settings
      actions.ts              server actions (validated with Zod)
    pay/[token]/              public client payment page
    api/ai/                   reminder drafts, natural-language invoices
    api/pay/ api/billing/     Razorpay order + verify
    api/webhooks/razorpay/    payment webhook
    api/cron/reminders/       daily auto-chase + plan expiry
  lib/                        ai, razorpay, fulfil, credits, plans, invoices, mailer
  components/                 UI and dashboard components
supabase/schema.sql           tables, RLS policies, grants, trigger
docs/                         executive briefing, monetization, demo script
```

## Submission docs

- [Executive briefing](docs/EXECUTIVE_BRIEFING.md): market friction, architecture, target cohort
- [Monetization engine](docs/MONETIZATION.md): pricing tiers, unit economics, revenue loops
- [Demo video script](docs/DEMO_SCRIPT.md): a 3-minute walkthrough

## Roadmap

- Payouts straight to each freelancer's bank account with **Razorpay Route** (split settlements)
- Auto-renewing plans with **Razorpay Subscriptions**
- WhatsApp reminders via the WhatsApp Business API
- PDF invoices with GSTIN, and recurring retainers
- Team seats and client portals for the Agency plan
