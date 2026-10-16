import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { DisplayStatus } from "@/lib/invoices";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const variants = {
  primary: "bg-ink text-paper hover:bg-ink-2 px-5 py-2.5",
  lime: "bg-lime text-ink hover:brightness-95 px-5 py-2.5",
  ghost: "border border-line bg-card text-ink hover:border-ink-2 px-4 py-2",
  danger: "border border-overdue/30 bg-card text-overdue hover:bg-overdue-soft px-4 py-2",
};

type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-card ${className}`}>{children}</div>;
}

const statusStyle: Record<DisplayStatus, string> = {
  paid: "bg-paid-soft text-paid",
  overdue: "bg-overdue-soft text-overdue",
  due: "bg-due-soft text-due",
  draft: "bg-line text-ink-2",
  void: "bg-line text-muted line-through",
};
const statusLabel: Record<DisplayStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  due: "Awaiting",
  draft: "Draft",
  void: "Void",
};

export function StatusBadge({ status, days }: { status: DisplayStatus; days?: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabel[status]}
      {status === "overdue" && days ? ` · ${days}d` : ""}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-paper/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:bg-card focus:outline-none";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl tracking-tight ${className}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-ink text-lime">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Duely
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const t =
    tone === "error"
      ? "border-overdue/30 bg-overdue-soft text-overdue"
      : tone === "success"
        ? "border-paid/30 bg-paid-soft text-paid"
        : "border-line bg-paper text-ink-2";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${t}`}>{children}</div>;
}
