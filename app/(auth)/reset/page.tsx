"use client";

import { useState } from "react";
import { ThemeLogo } from "@/components/theme-logo";
import Link from "next/link";

import { resetPassword } from "@/lib/auth/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPage() {
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const { error } = await resetPassword(email);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4"
      suppressHydrationWarning
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">

        {/* Brand header */}
        <div className="mb-4 flex justify-center">
          <Link href="/" className="inline-block">
            <ThemeLogo
              lightSrc="/logos/Horizontal_Logo.png"
              darkSrc="/logos/Dark_Mode_Transparent_Logo.png"
              alt="Confairo"
              width={165}
              height={55}
              priority
              className="w-[150px] sm:w-[165px] h-auto object-contain"
            />
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Reset Password
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            We’ll send you a secure reset link
          </p>
        </div>

        {/* Success */}
        {success ? (
          <div className="rounded-lg border border-success/30 bg-success-surface px-4 py-3 text-sm text-success text-center">
            ✅ Reset link sent. Please check your email.
          </div>
        ) : (

          <form onSubmit={handleReset} className="space-y-4">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Email address
              </label>

              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive-surface px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

          </form>
        )}

        {/* Back */}
        <div className="mt-6 text-center text-sm text-muted-foreground">

          <button
            onClick={() => history.back()}
            className="cursor-pointer text-primary hover:underline"
          >
            ← Back to login
          </button>

        </div>

      </div>
    </div>
  );
}
