import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
import { Logo } from "@/components/ui";
import { Nav } from "@/components/dashboard/Nav";
import { signOutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name, plan, ai_credits_used")
    .eq("id", user.id)
    .single();
  const plan = getPlan(profile?.plan);
  const used = profile?.ai_credits_used ?? 0;
  const pct = Math.min(100, Math.round((used / plan.aiCreditsPerMonth) * 100));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-10 border-b border-line bg-paper/90 px-4 py-4 backdrop-blur lg:h-dvh lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <form action={signOutAction} className="lg:hidden">
            <button className="text-sm text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
        <div className="mt-4 lg:mt-0">
          <Nav />
        </div>
        <div className="mt-8 hidden space-y-4 lg:block">
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-muted">{plan.name} plan</span>
              {plan.id === "free" && (
                <Link href="/dashboard/billing" className="font-medium text-lime-deep hover:underline">
                  Upgrade
                </Link>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-2">
              AI drafts <span className="tabular font-mono">{used}/{plan.aiCreditsPerMonth}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="px-1 text-xs text-muted">
            <p className="truncate font-medium text-ink-2">{profile?.business_name || profile?.full_name || "Your business"}</p>
            <p className="truncate">{user.email}</p>
            <form action={signOutAction} className="mt-2">
              <button className="hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
