"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

interface InviteData {
  id: string;
  conference_id: string;
  accepted: boolean | null;
  expires_at: string | null;
}

interface ConferenceInfo {
  title: string;
  start_date: string | null;
  end_date: string | null;
  organizer_id: string;
}

interface OrganizerInfo {
  name: string | null;
}

function InviteContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [conference, setConference] = useState<ConferenceInfo | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerInfo | null>(null);
  const [expired, setExpired] = useState(false);
  const [acceptedAnimation, setAcceptedAnimation] = useState(false);

  /* ---------------- LOAD INVITE INFO ---------------- */

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setInitialLoading(false);
        return;
      }

      try {
        const { data: invite, error } = await supabase
          .from("reviewer_invites")
          .select("id, conference_id, accepted, expires_at")
          .eq("token", token)
          .maybeSingle();

        if (error) throw error;
        if (!invite) throw new Error("Invalid invite link.");

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          setExpired(true);
        }

        setInviteData(invite);

        /* Load conference */
        const { data: conf } = await supabase
          .from("conferences")
          .select("title, start_date, end_date, organizer_id")
          .eq("id", invite.conference_id)
          .single();

        setConference(conf);

        /* Load organizer */
        if (conf?.organizer_id) {
          const { data: org } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", conf.organizer_id)
            .single();

          setOrganizer(org);
        }

      } catch (err: unknown) {
        toast({
          variant: "destructive",
          title: "Invite Error",
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setInitialLoading(false);
      }
    }

    loadInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---------------- ACCEPT INVITE ---------------- */

  const acceptInvite = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch("/api/reviewer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }


      setAcceptedAnimation(true);

      // Store role preference so dashboard redirects correctly
      localStorage.setItem("activeRole", "reviewer");

      toast({
        title: "Welcome 🎉",
        description: "You are now registered as a reviewer.",
      });

      setTimeout(() => {
        router.push("/dashboard/reviewer");
      }, 2000);

    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Failed to accept",
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DECLINE INVITE ---------------- */

  const declineInvite = async () => {
    if (!inviteData) return;

    try {
      await supabase
        .from("reviewer_invites")
        .update({ declined: true })
        .eq("id", inviteData.id);

      toast({
        title: "Invitation declined",
      });

      router.push("/");
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Failed to decline",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  /* ---------------- UI STATES ---------------- */

  if (!token) {
    return (
      <div className="text-center mt-20">
        <p className="text-destructive">Invalid invite link.</p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="text-center mt-20">
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-lg p-8 space-y-6 shadow-2xl rounded-2xl text-center transition-all duration-500">

        {acceptedAnimation ? (
          <div className="animate-bounce space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">You&apos;re now a Reviewer!</h2>
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Reviewer Invitation</h1>

            {conference && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  {conference.title}
                </h2>

                <p className="text-sm text-muted-foreground">
                  {conference.start_date} → {conference.end_date}
                </p>

                {organizer && (
                  <p className="text-sm text-muted-foreground">
                    Organized by <span className="font-medium">{organizer.name}</span>
                  </p>
                )}
              </div>
            )}

            {expired && (
              <Badge variant="destructive">
                Invite Expired
              </Badge>
            )}

            {/* Reviewer Benefits */}
            {!expired && !inviteData?.accepted && (
              <div className="bg-muted border border-border rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold text-sm">Why Review?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Gain academic recognition</li>
                  <li>• Expand professional network</li>
                  <li>• Contribute to research quality</li>
                  <li>• Receive official reviewer certificate</li>
                </ul>
              </div>
            )}

            <div className="space-y-3 pt-4">

              {!inviteData?.accepted && !expired && (
                <>
                  <Button
                    onClick={acceptInvite}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Accepting..." : "Accept Invitation"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={declineInvite}
                    className="w-full"
                  >
                    Decline
                  </Button>
                </>
              )}

              {inviteData?.accepted && (
                <Badge>
                  Already Accepted
                </Badge>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ReviewerInvitePage() {
  return (
    <Suspense
      fallback={<p className="text-center mt-10">Loading invitation...</p>}
    >
      <InviteContent />
    </Suspense>
  );
}
