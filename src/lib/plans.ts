export type PlanId = "free" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceInr: number; // per month
  tagline: string;
  activeInvoiceLimit: number | null; // null = unlimited
  aiCreditsPerMonth: number;
  platformFeePct: number; // fee on payments collected through Duely
  autoChase: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    priceInr: 0,
    tagline: "For your first few clients",
    activeInvoiceLimit: 5,
    aiCreditsPerMonth: 10,
    platformFeePct: 2,
    autoChase: false,
    features: [
      "5 unpaid invoices at a time",
      "10 AI follow-up drafts / month",
      "Hosted payment page (UPI, cards, netbanking)",
      "2% fee on payments collected",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceInr: 499,
    tagline: "For full-time freelancers",
    activeInvoiceLimit: null,
    aiCreditsPerMonth: 200,
    platformFeePct: 0.5,
    autoChase: true,
    features: [
      "Unlimited invoices",
      "200 AI follow-up drafts / month",
      "Auto-chase: overdue clients get reminded daily",
      "Client late-payment risk scores",
      "0.5% fee on payments collected",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceInr: 1499,
    tagline: "For studios billing many clients",
    activeInvoiceLimit: null,
    aiCreditsPerMonth: 1000,
    platformFeePct: 0,
    autoChase: true,
    features: [
      "Everything in Pro",
      "1,000 AI follow-up drafts / month",
      "0% fee on payments collected",
      "Priority support",
    ],
  },
};

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}
