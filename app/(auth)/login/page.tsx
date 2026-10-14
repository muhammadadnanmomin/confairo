"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeLogo } from "@/components/theme-logo";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { signIn } from "@/lib/auth/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createClient();

  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push(redirect ?? "/dashboard");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4"
      suppressHydrationWarning
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8 transition hover:shadow-xl">
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
            Welcome back
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to Confairo.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>

            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              required
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Password
            </label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive-surface px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Social login divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <div>
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push("/signup")}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              Sign up
            </button>
          </div>

          <div>
            <button
              onClick={() => router.push("/forgot-password")}
              className="cursor-pointer text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
