import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/format";
import { ButtonLink, Logo } from "@/components/ui";

const STEPS = [
  {
    n: "01",
    title: "Invoice in one sentence",
    body: "Type “logo 15k + 3 banners at 2k, 18% GST, due in 10 days”. AI turns it into a clean GST invoice.",
  },
  {
    n: "02",
    title: "Clients pay in one tap",
    body: "Every invoice gets a hosted payment page with UPI, cards and netbanking. Paid invoices close themselves.",
  },
  {
    n: "03",
    title: "AI does the chasing",
    body: "When an invoice goes overdue, Duely writes the follow-up in the right tone — friendly, firm, then final — and sends it.",
  },
];

const FAQ = [
  {
    q: "Who is Duely for?",
    a: "Freelancers, consultants and small agencies who bill clients by invoice and lose hours (and money) chasing late payments.",
  },
  {
    q: "How does my client pay?",
    a: "They open the link in your invoice or reminder and pay with any UPI app, card or netbanking through Razorpay. No account needed.",
  },
  {
    q: "Will the AI send anything without me?",
    a: "Only if you turn on auto-chase (Pro). Otherwise every draft waits for you to edit, copy or send it.",
  },
];

export default function Landing() {
  return (
    <div className="grain min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <a href="#pricing" className="hidden text-ink-2 hover:text-ink sm:inline">
            Pricing
          </a>
          <Link href="/login" className="text-ink-2 hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/signup" className="!px-4 !py-2">
            Start free
          </ButtonLink>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-2">
            <span className="size-1.5 rounded-full bg-lime-deep" /> AI invoice chaser for freelancers & agencies
          </p>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Get paid <em className="text-lime-deep">on time.</em>
            <br />
            Skip the awkward emails.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-2">
            Duely sends invoices with a one-tap UPI payment link, then uses AI to follow up with late clients in the right
            tone — so you can stop being your own collections department.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" className="!px-6 !py-3 !text-base">
              Start free — no card
            </ButtonLink>
            <ButtonLink href="#how" variant="ghost" className="!px-6 !py-3 !text-base">
              See how it works
            </ButtonLink>
          </div>
        </div>

        {/* Product vignette */}
        <div className="relative">
          <div className="rounded-3xl border border-line bg-card p-5 shadow-[0_30px_80px_-30px_rgba(23,21,15,0.35)]">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl">Needs chasing</p>
              <span className="rounded-full bg-overdue-soft px-2.5 py-0.5 text-xs font-medium text-overdue">3 late</span>
            </div>
            <ul className="mt-3 divide-y divide-line text-sm">
              {[
                ["Kapoor Realty", "₹33,040", "30d", "Final notice"],
                ["Lumen Labs", "₹56,640", "10d", "Firm reminder"],
                ["Tiny Tales Books", "₹10,620", "3d", "Friendly nudge"],
              ].map(([c, a, d, t]) => (
                <li key={c} className="flex items-center justify-between py-2.5">
                  <span>
                    {c}
                    <span className="block text-xs text-muted">{t}</span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block font-mono">{a}</span>
                    <span className="text-xs text-overdue">{d} overdue</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative -mt-6 ml-6 rounded-3xl bg-ink p-5 text-paper shadow-xl sm:ml-16">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-lime px-2 py-0.5 font-mono font-semibold uppercase text-ink">AI</span>
              <span className="text-paper/60">Firm reminder · drafted in 2s</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-paper/90">
              Hi Sneha, invoice INV-0007 for ₹56,640 was due on 6 Oct and is now 10 days overdue. Could you settle it or
              share a payment date by Monday? You can pay by UPI or card here:
            </p>
            <p className="mt-2 font-mono text-xs text-lime">duely.app/pay/7f3c…</p>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="font-mono text-sm text-muted">{s.n}</p>
              <h3 className="mt-2 font-display text-3xl">{s.title}</h3>
              <p className="mt-3 text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-end">
          <h2 className="font-display text-5xl leading-none">Know who’ll pay late before they do.</h2>
          <p className="text-lg text-ink-2">
            Duely scores every client on how they’ve paid you in the past, shows cash expected in the next 30 days, and tracks
            your average time-to-paid — the numbers that decide whether you can make rent.
          </p>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-display text-5xl">Simple pricing</h2>
        <p className="mt-2 text-ink-2">Start free. Upgrade when chasing starts eating your week.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-3xl border p-7 ${p.id === "pro" ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-3xl">{p.name}</h3>
                {p.id === "pro" && <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-medium text-ink">Most popular</span>}
              </div>
              <p className={`text-sm ${p.id === "pro" ? "text-paper/60" : "text-muted"}`}>{p.tagline}</p>
              <p className="mt-6">
                <span className="tabular font-mono text-5xl">{money(p.priceInr)}</span>
                <span className={`text-sm ${p.id === "pro" ? "text-paper/60" : "text-muted"}`}> / month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={p.id === "pro" ? "text-lime" : "text-lime-deep"}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/signup" variant={p.id === "pro" ? "lime" : "ghost"} className="mt-8 w-full">
                {p.id === "free" ? "Start free" : `Try ${p.name}`}
              </ButtonLink>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-5xl">Questions</h2>
          <dl className="space-y-8">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-2 text-ink-2">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-muted">
        <Logo className="!text-xl" />
        <p>Built for Galuxium Nexus V2 · Payments by Razorpay · AI by Groq</p>
      </footer>
    </div>
  );
}
