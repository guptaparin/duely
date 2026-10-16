import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in · Duely" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see who owes you money.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
