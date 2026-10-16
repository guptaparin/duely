import { requireUser } from "@/lib/supabase/server";
import { PLANS, getPlan } from "@/lib/plans";
import { fmtDate, money } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { UpgradeButton } from "@/components/dashboard/UpgradeButton";

export const metadata = { title: "Plan & billing · Duely" };

export default async function BillingPage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: payments }, { data: fees }] = await Promise.all([
    supabase.from("profiles").select("plan, plan_renews_at, ai_credits_used").eq("id", user!.id).single(),
    supabase
      .from("payments")
      .select("id, kind, plan, amount, razorpay_payment_id, created_at")
      .eq("kind", "subscription")
      .eq("status", "captured")
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("platform_fee").eq("status", "paid"),
  ]);
  const current = getPlan(profile?.plan);
  const feesPaid = (fees ?? []).reduce((s, f) => s + Number(f.platform_fee), 0);

  return (
    <>
      <PageHeader
        title="Plan & billing"
        subtitle={
          current.id === "free"
            ? "You’re on the free Starter plan."
            : `You’re on ${current.name}. Renews ${fmtDate(profile?.plan_renews_at)}.`
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(PLANS).map((p) => {
          const isCurrent = p.id === current.id;
          const featured = p.id === "pro";
          return (
            <Card key={p.id} className={`flex flex-col p-6 ${featured ? "border-ink ring-1 ring-ink" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-3xl">{p.name}</h2>
                {featured && <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-medium">Most popular</span>}
              </div>
              <p className="text-sm text-muted">{p.tagline}</p>
              <p className="mt-5">
                <span className="tabular font-mono text-4xl">{money(p.priceInr)}</span>
                <span className="text-sm text-muted"> / month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-lime-deep">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  p.id === "free" ? (
                    <p className="rounded-full border border-line py-2.5 text-center text-sm text-muted">Current plan</p>
                  ) : (
                    <UpgradeButton plan={p.id as "pro" | "agency"} label="Renew for 30 more days" variant="ghost" />
                  )
                ) : p.id === "free" ? null : (
                  <UpgradeButton plan={p.id as "pro" | "agency"} label={`Upgrade to ${p.name}`} variant={featured ? "lime" : "primary"} />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-2xl">This period</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">AI drafts used</dt>
              <dd className="tabular font-mono">
                {profile?.ai_credits_used ?? 0} / {current.aiCreditsPerMonth}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fee on collected payments</dt>
              <dd className="tabular font-mono">{current.platformFeePct}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Platform fees paid all-time</dt>
              <dd className="tabular font-mono">{money(feesPaid)}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Receipts</h2>
          {(payments ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No plan payments yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {payments!.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span>
                    {getPlan(p.plan).name} · {fmtDate(p.created_at)}
                    <span className="block font-mono text-xs text-muted">{p.razorpay_payment_id}</span>
                  </span>
                  <span className="tabular font-mono">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-muted">
        Payments are processed by Razorpay. Plans are billed for 30 days at a time; cancel anytime by not renewing.
      </p>
    </>
  );
}
