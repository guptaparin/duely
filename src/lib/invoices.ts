import type { Invoice, LineItem } from "./types";
import { daysBetween, todayISO } from "./format";

export type DisplayStatus = "draft" | "due" | "overdue" | "paid" | "void";

export function displayStatus(inv: Pick<Invoice, "status" | "due_date">, today = todayISO()): DisplayStatus {
  if (inv.status === "paid" || inv.status === "void" || inv.status === "draft") return inv.status;
  return inv.due_date < today ? "overdue" : "due";
}

export function daysOverdue(inv: Pick<Invoice, "due_date">, today = todayISO()) {
  return Math.max(0, daysBetween(inv.due_date, today));
}

export function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0));
  const total = round2(subtotal * (1 + (Number(taxRate) || 0) / 100));
  return { subtotal, total };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Tone escalates with how late the invoice is. */
export function suggestedTone(days: number): "friendly" | "firm" | "final" {
  if (days >= 21) return "final";
  if (days >= 7) return "firm";
  return "friendly";
}

export interface ClientRisk {
  score: number; // 0 (reliable) .. 100 (high risk)
  label: "Reliable" | "Watch" | "High risk" | "New";
  avgDaysLate: number;
  paidCount: number;
  overdueCount: number;
}

/**
 * Late-payment risk from the client's own history with this user:
 * average lateness on paid invoices, plus weight for anything overdue right now.
 */
export function clientRisk(invoices: Pick<Invoice, "status" | "due_date" | "paid_at">[], today = todayISO()): ClientRisk {
  const paid = invoices.filter((i) => i.status === "paid" && i.paid_at);
  const open = invoices.filter((i) => i.status === "sent");
  const overdue = open.filter((i) => i.due_date < today);

  if (paid.length === 0 && overdue.length === 0) {
    return { score: 0, label: "New", avgDaysLate: 0, paidCount: 0, overdueCount: 0 };
  }

  const lateness = paid.map((i) => Math.max(0, daysBetween(i.due_date, i.paid_at!.slice(0, 10))));
  const avgDaysLate = lateness.length ? lateness.reduce((a, b) => a + b, 0) / lateness.length : 0;
  const currentLate = overdue.reduce((s, i) => s + daysBetween(i.due_date, today), 0);

  const score = Math.min(100, Math.round(avgDaysLate * 2.5 + overdue.length * 15 + currentLate * 0.8));
  const label = score >= 60 ? "High risk" : score >= 25 ? "Watch" : "Reliable";
  return { score, label, avgDaysLate: Math.round(avgDaysLate), paidCount: paid.length, overdueCount: overdue.length };
}
