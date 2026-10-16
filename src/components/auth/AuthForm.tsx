"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: String(form.get("full_name") || "").trim(),
              business_name: String(form.get("business_name") || "").trim(),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Check your inbox to confirm your email, then sign in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <input name="full_name" required className={inputClass} placeholder="Parin Gupta" autoComplete="name" />
          </Field>
          <Field label="Business name">
            <input name="business_name" className={inputClass} placeholder="Pixel & Co. Studio" />
          </Field>
        </div>
      )}
      <Field label="Email">
        <input name="email" type="email" required className={inputClass} placeholder="you@studio.in" autoComplete="email" />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className={inputClass}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Duely?{" "}
            <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
