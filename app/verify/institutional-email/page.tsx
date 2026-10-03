"use client";

/**
 * Confairo — Phase 3D: Institutional Email Verification Confirmation Page
 *
 * Public page at /verify/institutional-email?token=<raw_token>[&returnTo=...]
 *
 * Security:
 *   - The raw token is extracted from searchParams solely to dispatch to
 *     POST /api/verification/confirm-email.
 *   - The token is NEVER rendered in the DOM, logged, stored in web storage,
 *     or exposed in error messaging.
 *   - returnTo query parameter is strictly validated: only internal relative
 *     paths starting with /dashboard are allowed, preventing open-redirect exploits.
 *   - Follows the Confairo "Academic Ink" design system (Geist, ink #17233D,
 *     secondary #52627A, accent #2D4A8A, restrained shadows, 6px button radius).
 */

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

type VerificationState =
  | "loading"
  | "success"
  | "error-invalid"
  | "error-expired"
  | "error-used"
  | "error-generic"
  | "no-token";

/**
 * Validates and sanitizes a return target to prevent open redirect vulnerabilities.
 * Only internal relative paths starting with /dashboard are permitted.
 */
function getSafeReturnUrl(target: string | null): string {
  const DEFAULT_RETURN = "/dashboard/organizer/conferences";
  if (!target) return DEFAULT_RETURN;

  const trimmed = target.trim();
  // Must start with a single slash, not a double slash, backslash, or protocol
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://")
  ) {
    const pathnameOnly = trimmed.split("?")[0];
    if (pathnameOnly.startsWith("/dashboard")) {
      return trimmed;
    }
  }

  return DEFAULT_RETURN;
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const returnToRaw = searchParams.get("returnTo");

  const returnUrl = useMemo(() => getSafeReturnUrl(returnToRaw), [returnToRaw]);

  const [state, setState] = useState<VerificationState>(
    token ? "loading" : "no-token"
  );
  const [serverMessage, setServerMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    async function confirmVerification() {
      try {
        const res = await fetch("/api/verification/confirm-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (res.ok && data.success) {
          setState("success");
          setServerMessage(
            data.message || "Institutional affiliation verified successfully."
          );
        } else {
          const msg = (data.message || "").toLowerCase();
          if (msg.includes("expired")) {
            setState("error-expired");
          } else if (msg.includes("already been used") || msg.includes("already used")) {
            setState("error-used");
          } else if (msg.includes("invalid")) {
            setState("error-invalid");
          } else {
            setState("error-generic");
          }
          setServerMessage(
            data.message ||
              "This verification link is invalid, has expired, or has already been used."
          );
        }
      } catch {
        if (!isMounted) return;
        setState("error-generic");
        setServerMessage(
          "We could not complete the verification. Please check your connection and try again."
        );
      }
    }

    confirmVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 antialiased font-sans">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2 text-foreground">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Confairo
        </span>
      </div>

      {/* Main Verification Card */}
      <main className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        {/* ========================================================== */}
        {/* 1. LOADING STATE                                           */}
        {/* ========================================================== */}
        {state === "loading" && (
          <div className="space-y-4 py-3" role="status" aria-live="polite">
            <div className="flex justify-center">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Verifying your institutional affiliation
              </h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your verification link.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 2. SUCCESS STATE                                           */}
        {/* ========================================================== */}
        {state === "success" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-surface text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Institutional affiliation verified
              </h1>
              <p className="text-sm text-muted-foreground">
                Your institutional affiliation has been successfully verified for Confairo.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground text-left space-y-1">
              <p className="font-medium text-foreground">Next steps:</p>
              <p>
                You can now return to your organizer dashboard to publish and manage your conferences.
              </p>
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button className="w-full gap-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[6px]">
                  Return to Confairo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 3. EXPIRED TOKEN                                          */}
        {/* ========================================================== */}
        {state === "error-expired" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-surface text-warning">
              <Clock className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Verification link expired
              </h1>
              <p className="text-sm text-muted-foreground">
                This verification link has expired. Verification links are single-use and valid for 24 hours.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground text-left">
              Please sign in to Confairo and request a new verification link from your account settings.
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button variant="outline" className="w-full rounded-[6px]">
                  Return to Confairo
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 4. ALREADY USED / REPLAYED TOKEN                           */}
        {/* ========================================================== */}
        {state === "error-used" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Verification link already used
              </h1>
              <p className="text-sm text-muted-foreground">
                This verification link has already been used. If your account is already verified, you can proceed to your dashboard.
              </p>
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-[6px]">
                  Return to Confairo
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 5. INVALID TOKEN                                          */}
        {state === "error-invalid" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive-surface text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Verification link is invalid
              </h1>
              <p className="text-sm text-muted-foreground">
                This verification link is no longer valid. Please check that the URL was not truncated or request a new verification link.
              </p>
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button variant="outline" className="w-full rounded-[6px]">
                  Return to Confairo
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 6. GENERIC ERROR                                          */}
        {/* ========================================================== */}
        {state === "error-generic" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive-surface text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Verification could not be completed
              </h1>
              <p className="text-sm text-muted-foreground">
                {serverMessage ||
                  "We could not complete the verification. Please try again or request a new verification email."}
              </p>
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button variant="outline" className="w-full rounded-[6px]">
                  Return to Confairo
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 7. NO TOKEN STATE                                         */}
        {/* ========================================================== */}
        {state === "no-token" && (
          <div className="space-y-5 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-surface text-warning">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-foreground">
                Missing verification token
              </h1>
              <p className="text-sm text-muted-foreground">
                This page requires a valid verification link. Please open the link sent to your institutional email.
              </p>
            </div>

            <div className="pt-2">
              <Link href={returnUrl}>
                <Button variant="outline" className="w-full rounded-[6px]">
                  Return to Confairo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Subtle Academic Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        Confairo &mdash; Academic Conference Management Platform
      </footer>
    </div>
  );
}

export default function VerifyInstitutionalEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 antialiased font-sans">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading verification...</p>
          </div>
        </div>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
