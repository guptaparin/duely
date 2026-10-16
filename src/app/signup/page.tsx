import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account · Duely" };

export default function SignupPage() {
  return (
    <AuthShell title="Get paid on time" subtitle="Free forever for your first 5 open invoices. No card needed.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
