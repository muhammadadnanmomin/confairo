"use client";

/**
 * Confairo — Phase 3A: useVerification Client Hook
 *
 * Provides reactive access to the current authenticated user's verification
 * status by querying the secure GET /api/verification/status endpoint.
 *
 * Security:
 *   - The browser never queries user_verifications directly
 *   - The hook queries /api/verification/status with the user's session token
 *   - Window focus revalidation ensures status updates when returning from email verification
 *   - Duplicate in-flight requests are prevented
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface VerificationState {
  isVerified: boolean | null;
  verificationType: "institutional_email" | "manual_affiliation" | null;
  institutionName: string | null;
  institutionalEmail: string | null;
  hasPendingRequest: boolean;
  pendingEmail: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const supabase = createClient();

const INITIAL_STATE = {
  isVerified: null as boolean | null,
  verificationType: null as "institutional_email" | "manual_affiliation" | null,
  institutionName: null as string | null,
  institutionalEmail: null as string | null,
  hasPendingRequest: false,
  pendingEmail: null as string | null,
  expiresAt: null as string | null,
};

export function useVerification(): VerificationState {
  const [data, setData] = useState(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMountedRef.current) {
          setData({
            ...INITIAL_STATE,
            isVerified: false,
          });
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const res = await fetch("/api/verification/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch verification status (${res.status})`
        );
      }

      const result = await res.json();

      if (isMountedRef.current) {
        setData({
          isVerified: result.isVerified ?? false,
          verificationType: result.verificationType ?? null,
          institutionName: result.institutionName ?? null,
          institutionalEmail: result.institutionalEmail ?? null,
          hasPendingRequest: result.hasPendingRequest ?? false,
          pendingEmail: result.pendingEmail ?? null,
          expiresAt: result.expiresAt ?? null,
        });
        setError(null);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const fetchError =
          err instanceof Error
            ? err
            : new Error("An unexpected error occurred while checking verification status.");
        setError(fetchError);
        setIsLoading(false);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();

    // Listen for auth state changes (e.g. login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchStatus();
      } else {
        if (isMountedRef.current) {
          setData({
            ...INITIAL_STATE,
            isVerified: false,
          });
          setIsLoading(false);
          setError(null);
        }
      }
    });

    // Revalidate on window focus (catches completion after clicking link in email inbox)
    function handleFocus() {
      fetchStatus();
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchStatus]);

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchStatus,
  };
}
