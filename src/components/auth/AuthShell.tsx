import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md py-12">
          <h1 className="font-display text-5xl leading-none tracking-tight">{title}</h1>
          <p className="mt-3 mb-8 text-muted">{subtitle}</p>
          {children}
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 opacity-[0.07] grain" style={{ filter: "invert(1)" }} />
        <p className="relative font-display text-5xl leading-[1.05]">
          You did the work. Duely makes sure the money arrives.
        </p>
        <p className="relative mt-6 text-sm text-paper/60">
          Invoices with a one-tap UPI link, follow-ups written by AI, and a dashboard that shows exactly who owes you.
        </p>
        <div className="relative mt-10 flex gap-3 font-mono text-xs">
          <span className="rounded-full bg-lime px-3 py-1 text-ink">UPI</span>
          <span className="rounded-full border border-paper/20 px-3 py-1">Cards</span>
          <span className="rounded-full border border-paper/20 px-3 py-1">Netbanking</span>
          <span className="rounded-full border border-paper/20 px-3 py-1">AI follow-ups</span>
        </div>
      </aside>
    </main>
  );
}
