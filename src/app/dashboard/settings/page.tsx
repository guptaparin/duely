import { requireUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
import { emailEnabled } from "@/lib/mailer";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export const metadata = { title: "Settings · Duely" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name, auto_chase, plan")
    .eq("id", user!.id)
    .single();
  const plan = getPlan(profile?.plan);
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-3xl p-6">
        <SettingsForm
          fullName={profile?.full_name ?? ""}
          businessName={profile?.business_name ?? ""}
          autoChase={profile?.auto_chase ?? false}
          canAutoChase={plan.autoChase}
        />
        {!emailEnabled() && (
          <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
            Direct email sending isn’t configured on this deployment, so follow-ups open in your own email app instead.
          </p>
        )}
      </Card>
    </>
  );
}
