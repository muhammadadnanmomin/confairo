"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";

const supabase = createClient();

// In-memory module cache to prevent repeated fetching / flicker across internal navigations
let cachedOrg: any = null;
let orgLoaded = false;
let isFetchingOrg = false;
let lastOrgFetch = 0;
const orgListeners = new Set<(org: any) => void>();

function notifyOrgListeners(org: any) {
  cachedOrg = org;
  orgLoaded = true;
  lastOrgFetch = Date.now();
  orgListeners.forEach((fn) => fn(org));
}

export function useOrganization() {
  const { profile, loading: profileLoading } = useProfile();
  const [organization, setOrganization] = useState<any>(cachedOrg);
  const [loading, setLoading] = useState(!orgLoaded);

  const fetchOrganization = useCallback(async (isForced = false) => {
    if (!profile) return;

    if (isFetchingOrg && !isForced) return;
    isFetchingOrg = true;

    try {
      // 🔹 try membership first
      const { data } = await supabase
        .from("organization_members")
        .select(`organization:organizations(*)`)
        .eq("user_id", profile.id)
        .limit(1)
        .maybeSingle();

      if (data?.organization) {
        notifyOrgListeners(data.organization);
        return;
      }

      // 🔹 admin fallback → fetch first organization
      if (profile.role === "admin") {
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        notifyOrgListeners(org || null);
        return;
      }

      // 🔹 no organization
      notifyOrgListeners(null);
    } catch (err) {
      console.error("Failed to fetch organization:", err);
    } finally {
      isFetchingOrg = false;
    }
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const listener = (newOrg: any) => {
      if (mounted) {
        setOrganization(newOrg);
        setLoading(false);
      }
    };
    orgListeners.add(listener);

    if (profileLoading) {
      return () => {
        orgListeners.delete(listener);
      };
    }

    if (!profile) {
      if (!orgLoaded) {
        notifyOrgListeners(null);
      }
      if (mounted) {
        setLoading(false);
      }
      return () => {
        orgListeners.delete(listener);
      };
    }

    if (!orgLoaded) {
      fetchOrganization(false).then(() => {
        if (mounted) setLoading(false);
      });
    }

    function handleFocus() {
      if (profile && Date.now() - lastOrgFetch > 60000) {
        fetchOrganization(false);
      }
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      orgListeners.delete(listener);
      window.removeEventListener("focus", handleFocus);
    };
  }, [profile, profileLoading, fetchOrganization]);

  const refetch = useCallback(async () => {
    await fetchOrganization(true);
  }, [fetchOrganization]);

  return { organization, loading, refetch };
}
