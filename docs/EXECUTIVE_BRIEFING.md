# Duely — Executive Briefing

**One line:** Duely is an AI accounts-receivable assistant for freelancers and small agencies. It sends invoices with a one-tap UPI payment link, then writes and sends the follow-ups that get late clients to pay.

---

## 1. The Market Friction

Independent professionals do the work first and get paid later. "Later" is the problem:

- **Late payment is routine, not rare.** Bonsai analysed invoicing data from more than 100,000 freelancers and found that **29% of invoices were paid late**. ([Bonsai](https://www.hellobonsai.com/blog/late-freelance-payment))
- **Chasing is unpaid, awkward work.** Each overdue invoice needs several follow-ups. Most freelancers write them by hand, put them off because they fear damaging the relationship, or never send them at all.
- **Paying is harder than it should be.** In India, clients are used to paying by UPI in seconds. Yet a typical freelancer invoice is a PDF with bank details that the client has to type into their banking app. Every step in between is a reason to delay.
- **There's no early warning.** A freelancer usually finds out a client is a slow payer only after it has already hurt their cash flow.

The result: unpredictable income, hours lost to admin, and real money written off by the people least able to absorb it.

## 2. The Architecture (how Duely solves it, efficiently and securely)

Duely attacks each source of delay in turn:

| Friction | Duely's answer |
|---|---|
| Writing invoices takes time | **AI invoice builder.** Describe the work in one sentence ("logo 15k, 3 banners at 2k, 18% GST, due in 10 days"). Groq's Llama 3.3 70B returns line items, tax and due date in JSON mode. Zod validates the output before it ever reaches the form. |
| Paying is clunky | **Hosted payment page per invoice**, with Razorpay Checkout for UPI, cards, netbanking and wallets. The client needs no account. |
| Chasing is awkward | **AI follow-ups whose tone escalates with lateness**: friendly at 0–6 days, firm at 7–20, final at 21+. Each one includes the exact amount, the invoice number and the pay link, and the freelancer can edit it before sending. |
| Chasing is forgotten | **Auto-chase (Pro).** A daily cron job drafts and sends reminders for overdue invoices, at most once every three days per invoice. |
| No early warning | **Client risk score (0–100)**, computed from each client's own history: average days late, invoices overdue now, and how far overdue they are. |

**Technical design**

- **Stack:** Next.js 15 on Vercel, Supabase (Postgres + Auth), Groq, Razorpay, all on free tiers.
- **Server-first rendering.** All data access runs in Server Components and Server Actions, so no secret key ever reaches the browser.
- **Row Level Security on every table.** The database itself guarantees that one user can never read another's clients or invoices.
- **Paid features can't be faked.** Users can't change their own plan or AI credit columns, because column grants block it. Plans change only after a server-verified payment.
- **Payment integrity.** Razorpay orders are created server-side.
  - The checkout response is verified with an HMAC-SHA256 signature and a timing-safe comparison.
  - A signed webhook provides a second, independent confirmation.
  - A single idempotent `fulfilOrder()` function marks the invoice paid exactly once.
- **Private payment links.** Each public payment page is addressed by a random UUID token, never by a database ID, and it shows only what the payer needs to see.
- **AI cost controls.** Monthly per-plan credits are enforced server-side, and failed generations are refunded.

## 3. The Target Cohort

**Primary:** Indian freelancers and solo consultants who bill **₹25,000–₹5,00,000 a month** across **3–15 clients**. This includes designers, developers, video editors, marketers, writers and CA/CS consultants. They invoice by hand today, already think in UPI, and feel every late payment.

**Secondary:** **Small agencies and studios (2–20 people)** billing dozens of clients. They need auto-chase at volume and the lowest transaction fee, which is why they're on the Agency plan.

**Why they adopt:**

- **The first win comes in minutes.** Sign up, describe one job, and send a payment link.
- **The value is easy to measure:** money arrives sooner.
- **Every invoice Duely sends shows Duely to a new business.** Each payment page carries "Invoicing by Duely", so the product spreads through the clients who receive it.
