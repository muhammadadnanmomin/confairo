"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";
import { useOrganization } from "@/lib/organizations/useOrganization";
import { usePlan } from "@/lib/plans/usePlan";
import { getMyConferenceIds } from "@/lib/conference/getMyConferenceIds";
import { formatLimit, PLAN_LABELS, normalizePlanType, type PlanType } from "@/lib/config/pricing";
import UpgradeModal from "@/components/upgrade/UpgradeModal";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Calendar,
  FileText,
  Users,
  CreditCard,
  Plus,
  Building2,
  Zap,
  CheckCircle,
  XCircle,
  ArrowRight,
  Monitor,
  ClipboardList,
  UserCheck,
  IndianRupee,
  BarChart3,
  CalendarClock,
  Layers,
  Sparkles,
  Crown,
  Pencil,
} from "lucide-react";

import Link from "next/link";

const supabase = createClient();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OrganizerDashboard() {
  const { profile } = useProfile();
  const { organization, loading: orgLoading } = useOrganization();
  const plan = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [stats, setStats] = useState({
    conferences: 0,
    activeConferences: 0,
    submissions: 0,
    reviewers: 0,
    revenue: 0,
    openSubmissions: 0,
    closedSubmissions: 0,
  });

  const [scheduleStats, setScheduleStats] = useState({
    totalDays: 0,
    totalTracks: 0,
    totalSessions: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      if (!profile) return;
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      /* ---- Conferences ---- */
      const myIds = await getMyConferenceIds(profile.id, organization?.id);

      if (myIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: conferences, error } = await supabase
        .from("conferences")
        .select("*")
        .in("id", myIds)
        .order("created_at", { ascending: false });

      const allConfs = conferences || [];
      const conferenceIds = allConfs.map((c) => c.id);

      /* Active conferences (published + not ended) */
      const activeConferences = allConfs.filter(
        (c) => c.is_published && c.end_date >= today
      ).length;

      /* Submission status overview */
      let openSubmissions = 0;
      let closedSubmissions = 0;
      for (const c of allConfs) {
        if (c.submission_deadline) {
          if (c.submission_deadline >= today) openSubmissions++;
          else closedSubmissions++;
        }
      }

      /* ---- Submissions count ---- */
      let submissions = 0;
      if (conferenceIds.length > 0) {
        const { count } = await supabase
          .from("paper_submissions")
          .select("*", { count: "exact", head: true })
          .in("conference_id", conferenceIds);
        submissions = count || 0;
      }

      /* ---- Reviewer count ---- */
      let reviewerCount = 0;
      if (conferenceIds.length > 0) {
        const { data } = await supabase
          .from("conference_staff")
          .select("user_id")
          .in("conference_id", conferenceIds)
          .eq("role", "reviewer");
        reviewerCount = new Set(data?.map((r) => r.user_id)).size;
      }

      /* ---- Revenue ---- */
      let revenue = 0;

      if (conferenceIds.length > 0) {
        /* Registration payments */
        const { data: regPayments } = await supabase
          .from("conference_registrations")
          .select("amount, payment_status")
          .in("conference_id", conferenceIds)
          .eq("payment_status", "success");

        if (regPayments) {
          revenue += regPayments.reduce(
            (sum, p) => sum + (p.amount || 0),
            0
          );
        }

        /* Paper fee payments */
        const { data: paperPayments } = await supabase
          .from("paper_submissions")
          .select("payment_conference_fee")
          .in("conference_id", conferenceIds)
          .eq("payment_status", "paid");

        if (paperPayments) {
          revenue += paperPayments.reduce(
            (sum, p) => sum + (Number(p.payment_conference_fee) || 0),
            0
          );
        }
      }

      /* ---- Schedule stats ---- */
      let totalDays = 0;
      let totalTracks = 0;
      let totalSessions = 0;

      if (conferenceIds.length > 0) {
        const { count: daysCount } = await supabase
          .from("conference_days")
          .select("*", { count: "exact", head: true })
          .in("conference_id", conferenceIds);
        totalDays = daysCount || 0;

        const { count: tracksCount } = await supabase
          .from("tracks")
          .select("*", { count: "exact", head: true })
          .in("conference_id", conferenceIds);
        totalTracks = tracksCount || 0;

        const { count: sessionsCount } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .in("conference_id", conferenceIds);
        totalSessions = sessionsCount || 0;
      }

      setScheduleStats({ totalDays, totalTracks, totalSessions });

      setStats({
        conferences: allConfs.length,
        activeConferences,
        submissions,
        reviewers: reviewerCount,
        revenue,
        openSubmissions,
        closedSubmissions,
      });

      setRecent(allConfs.slice(0, 5));
      setLoading(false);
    }

    load();
  }, [profile, organization]);

  const today = new Date().toISOString().split("T")[0];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organizer Dashboard
          </h1>

          {orgLoading ? (
            <div className="h-5 w-48 mt-1.5 animate-pulse rounded bg-muted" />
          ) : organization ? (
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {organization.name}
              </span>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Link href="/dashboard/organizer/settings" className="inline-flex items-center gap-1">
                  <Pencil className="h-3 w-3" />
                  Edit Organization
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-warning mt-1">
              No organization found
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!orgLoading && !organization && (
            <Button asChild variant="outline">
              <Link href="/dashboard/onboarding/organization">
                Create Organization
              </Link>
            </Button>
          )}

          <Button asChild>
            <Link href="/dashboard/organizer/conferences/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New Conference
            </Link>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Plan & Usage Card                                            */}
      {/* ============================================================ */}
      {!plan.loading && (
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.planType === "free"
                ? "bg-muted"
                : plan.planType === "pro"
                  ? "bg-accent"
                  : "bg-primary/20"
                }`}>
                <Crown className={`h-5 w-5 ${plan.planType === "free"
                  ? "text-muted-foreground"
                  : plan.planType === "pro"
                    ? "text-primary"
                    : "text-foreground"
                  }`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <Badge className={`text-[11px] ${plan.planType === "free"
                    ? "bg-muted text-muted-foreground border-border hover:bg-muted"
                    : plan.planType === "pro"
                      ? "bg-accent text-accent-foreground border-accent hover:bg-accent"
                      : "bg-primary text-primary-foreground border-primary hover:bg-primary"
                    }`}>
                    {PLAN_LABELS[plan.planType]}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-1">
                  {/* Conference usage */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Conferences: {plan.conferencesUsed} / {formatLimit(plan.conferenceLimit)}
                    </span>
                    {plan.conferenceLimit !== null && (
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${plan.conferencesUsed >= plan.conferenceLimit
                            ? "bg-destructive"
                            : "bg-primary"
                            }`}
                          style={{ width: `${Math.min(100, (plan.conferencesUsed / plan.conferenceLimit) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Submission usage – only shown for free plan */}
                  {plan.planType === "free" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Submissions: {plan.submissionsUsed} / {formatLimit(plan.submissionLimit)}
                      </span>
                      {plan.submissionLimit !== null && (
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${plan.submissionsUsed >= plan.submissionLimit
                              ? "bg-destructive"
                              : "bg-info"
                              }`}
                            style={{ width: `${Math.min(100, (plan.submissionsUsed / plan.submissionLimit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {plan.planType !== "institutional" && (
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-primary hover:bg-primary-hover gap-2 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                {plan.planType === "free" ? "Upgrade Plan" : "Buy Conference Slot"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  Stats Grid                                                   */}
      {/* ============================================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Conferences"
          value={stats.conferences}
          icon={Calendar}
          iconBg="bg-accent"
          iconColor="text-primary"
        />
        <StatCard
          title="Active Now"
          value={stats.activeConferences}
          icon={Zap}
          iconBg="bg-accent"
          iconColor="text-primary"
        />
        <StatCard
          title="Submissions"
          value={stats.submissions}
          icon={FileText}
          iconBg="bg-info-surface"
          iconColor="text-info"
        />
        <StatCard
          title="Reviewers"
          value={stats.reviewers}
          icon={Users}
          iconBg="bg-success-surface"
          iconColor="text-success"
        />
        <StatCard
          title="Total Collections"
          value={`₹${stats.revenue.toLocaleString()}`}
          icon={IndianRupee}
          iconBg="bg-success-surface"
          iconColor="text-success"
        />
      </div>

      {/* ============================================================ */}
      {/*  Submission Overview + Quick Actions Row                      */}
      {/* ============================================================ */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Submission Overview */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-surface">
              <BarChart3 className="h-4 w-4 text-info" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Submission Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success-surface px-4 py-3">
              <CheckCircle className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {stats.openSubmissions}
                </p>
                <p className="text-xs text-success">Open</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive-surface px-4 py-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {stats.closedSubmissions}
                </p>
                <p className="text-xs text-destructive">Closed</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Quick Actions
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/organizer/conferences/new">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm">New Conference</span>
              </Button>
            </Link>

            <Link href="/dashboard/organizer/conferences">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <ClipboardList className="h-4 w-4 text-info" />
                <span className="text-sm">Manage Conferences</span>
              </Button>
            </Link>

            <Link href="/dashboard/organizer/reviewers">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <UserCheck className="h-4 w-4 text-success" />
                <span className="text-sm">Manage Reviewers</span>
              </Button>
            </Link>

            <Link href="/dashboard/organizer/submissions">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">View Submissions</span>
              </Button>
            </Link>

            <Link href="/dashboard/organizer/schedule">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <CalendarClock className="h-4 w-4 text-warning" />
                <span className="text-sm">Manage Schedule</span>
              </Button>
            </Link>
          </div>
        </Card>

      </div>

      {/* ============================================================ */}
      {/*  Schedule Overview                                             */}
      {/* ============================================================ */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-surface">
              <CalendarClock className="h-4 w-4 text-warning" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Schedule Overview
            </h3>
            {scheduleStats.totalSessions > 0 && (
              <Badge className="bg-success-surface text-success border-success/30 hover:bg-success-surface text-[11px]">
                <CheckCircle className="h-3 w-3" />
                Schedule Ready
              </Badge>
            )}
          </div>

          <Link
            href="/dashboard/organizer/schedule"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Manage Schedule
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {scheduleStats.totalDays === 0 &&
          scheduleStats.totalTracks === 0 &&
          scheduleStats.totalSessions === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-surface">
              <CalendarClock className="h-6 w-6 text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">
              You haven&apos;t configured any schedule yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up days, tracks, and sessions for your conferences.
            </p>
            <Link href="/dashboard/organizer/schedule" className="mt-4 inline-block">
              <Button variant="outline" className="gap-2">
                <CalendarClock className="h-4 w-4" />
                Manage Schedule
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-warning-surface/50 border-warning/20 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {scheduleStats.totalDays}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Days Configured</p>
            </div>
            <div className="rounded-lg border bg-accent/50 border-accent px-4 py-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {scheduleStats.totalTracks}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Tracks Configured</p>
            </div>
            <div className="rounded-lg border bg-info-surface/50 border-info/20 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {scheduleStats.totalSessions}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Sessions</p>
            </div>
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/*  Recent Conferences                                           */}
      {/* ============================================================ */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Conferences
          </h2>

          <Link
            href="/dashboard/organizer/conferences"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Loading…
          </p>
        )}

        {!loading && recent.length === 0 ? (
          /* Empty state */
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No conferences yet
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              You haven&apos;t created any conferences yet. Get started
              by creating your first academic event.
            </p>
            <Link href="/dashboard/organizer/conferences/new" className="mt-4 inline-block">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Conference
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((c) => {
              const submissionsOpen =
                c.submission_deadline && c.submission_deadline >= today;
              const submissionsClosed =
                c.submission_deadline && c.submission_deadline < today;

              return (
                <Link
                  key={c.id}
                  href={`/dashboard/organizer/conferences/${c.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Title row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {c.title}
                      </span>

                      {c.short_name && (
                        <Badge variant="secondary" className="text-[11px] shrink-0">
                          {c.short_name}
                        </Badge>
                      )}

                      <Badge
                        className={`text-[11px] shrink-0 ${c.is_published
                          ? "bg-success-surface text-success border-success/30 hover:bg-success-surface"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted"
                          }`}
                      >
                        {c.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </span>

                      {c.mode && (
                        <Badge variant="outline" className="text-[11px] capitalize">
                          <Monitor className="h-3 w-3" />
                          {c.mode}
                        </Badge>
                      )}

                      {c.currency && (
                        <Badge variant="outline" className="text-[11px]">
                          <CreditCard className="h-3 w-3" />
                          {c.currency}
                        </Badge>
                      )}

                      {submissionsOpen && (
                        <Badge className="text-[11px] bg-success-surface text-success border-success/30 hover:bg-success-surface">
                          <CheckCircle className="h-3 w-3" />
                          Open
                        </Badge>
                      )}
                      {submissionsClosed && (
                        <Badge variant="secondary" className="text-[11px] text-destructive bg-destructive-surface border-destructive/30 hover:bg-destructive-surface">
                          <XCircle className="h-3 w-3" />
                          Closed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 hidden sm:block" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/*  Upgrade Modal                                                */}
      {/* ============================================================ */}
      {organization && profile && (
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          organizationId={organization.id}
          userId={profile.id}
        />
      )}

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>

      <div className={`${iconBg} p-3 rounded-lg`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </Card>
  );
}