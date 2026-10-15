"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* Strong typing for identity only */
interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at?: string;
}

// Module-level cache to eliminate reload/flicker across internal navigations
let cachedProfile: Profile | null = null;
let profileLoaded = false;
let isFetchingProfile = false;
const profileListeners = new Set<(p: Profile | null) => void>();

function notifyProfileListeners(p: Profile | null) {
  cachedProfile = p;
  profileLoaded = true;
  profileListeners.forEach((fn) => fn(p));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState<boolean>(!profileLoaded);

  useEffect(() => {
    let mounted = true;

    const listener = (p: Profile | null) => {
      if (mounted) {
        setProfile(p);
        setLoading(false);
      }
    };
    profileListeners.add(listener);

    async function loadProfile(user: any) {
      if (!user) {
        notifyProfileListeners(null);
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (isFetchingProfile && profileLoaded) return;
      isFetchingProfile = true;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
            id,
            name,
            email,
            avatar_url,
            bio,
            role,
            created_at
        `)
        .eq("id", user.id)
        .single();

      isFetchingProfile = false;

      if (!error && data) {
        notifyProfileListeners(data);
      } else {
        if (error) console.error("Profile load error:", error);
        notifyProfileListeners(null);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    if (!profileLoaded && !isFetchingProfile) {
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) loadProfile(data.user);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_OUT") {
        notifyProfileListeners(null);
      } else if (session?.user) {
        loadProfile(session.user);
      }
    });

    return () => {
      mounted = false;
      profileListeners.delete(listener);
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
