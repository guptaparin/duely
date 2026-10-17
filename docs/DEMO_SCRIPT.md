# Demo video script (target 3:00, max 5:00)

**Setup before recording**
- Deployed app open in Chrome at 1440 px wide, zoomed to 110%.
- A fresh account on the **Starter** plan, already signed in.
- A second browser profile or incognito window ready for the "client" view.
- Razorpay in **test mode**.
- Record with OBS (free) at 1080p. Don't narrate the setup; start on the dashboard.

---

**0:00–0:20 — The problem (landing page)**
> "Roughly a third of freelance invoices get paid late, and chasing them is unpaid, awkward work. Duely is an AI invoice chaser: clients pay in one tap, and AI handles the follow-ups."

Scroll the hero briefly, then click **Sign in**.

**0:20–0:45 — Empty account → real data**
On the empty dashboard, click **Load sample clients & invoices**.
> "Here's a freelancer with a few months of history: four clients, some paid on time, some late."

Point at the four stat cards, the **Needs chasing** list with escalating tone labels, and the **Cash flow** chart, including the "next 30 days" projection.

**0:45–1:25 — Invoice in one sentence (AI)**
Go to **New invoice**. Type:
`Website redesign 40k, 2 rounds of revisions at 5k each, 18% GST, due in 7 days`

Click **Fill invoice with AI**.
> "Plain English becomes GST-ready line items. The output is schema-validated, so the model can't break the invoice."

Pick a client and click **Create invoice & payment link**. Copy the link.

**1:25–2:05 — The client pays (Razorpay)**
Paste the link into the incognito window.
> "This is what the client sees. No login, just pay."

Click **Pay**. In Razorpay test checkout choose **Netbanking**, pick any bank, then click **Success**. The payment succeeds. (Or use card `4100 2800 0000 1007`, any future expiry, any CVV.)

Switch back to the dashboard and refresh.
> "The signature is verified on the server, a webhook confirms it again, and the invoice is marked paid exactly once."

Show the **Paid** badge, the Razorpay payment ID and the platform fee.

**2:05–2:40 — AI follow-up**
Open the ~30-day overdue **Kapoor Realty** invoice.
> "Duely suggests a final-notice tone because it's a month late."

Click **Write follow-up with AI**. Show the draft, with the amount, invoice number and pay link included. Switch tone to **Friendly** and rewrite to show the difference. Click **Open in email app** or **Send**, and point at the **History** log.

**2:40–3:10 — Monetization**
Go to **Plan & billing**.
> "Three ways Duely makes money: subscriptions, a transaction fee that drops as you upgrade, and AI credits as the upgrade lever."

Click **Upgrade to Pro** and pay with test card `4100 2800 0000 1007`. The plan switches to Pro and the receipt appears.

Open **Clients**: risk scores are now unlocked. Open **Settings**: auto-chase can now be switched on.
> "Every morning, a cron job chases overdue clients automatically."

**3:10–3:30 — Close**
> "Next.js, Supabase with row-level security, Groq, Razorpay, live on Vercel. Duely: you did the work, now get paid for it."

End on the landing page logo.
