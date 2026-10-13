"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/lib/auth/RoleGuard";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
} from "lucide-react";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const [stats, setStats] = useState({
    users: 0,
    conferences: 0,
    submissions: 0,
    revenue: 0,
  });

  /* Load reports */
  async function loadReports() {
    setLoading(true);

    const users = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const conferences = await supabase
      .from("conferences")
      .select("*", { count: "exact", head: true });

    const submissions = await supabase
      .from("paper_submissions")
      .select("*", { count: "exact", head: true });

    const payments = await supabase
      .from("conference_registrations")
      .select("amount")
      .eq("payment_status", "success");

    const revenue =
      payments.data?.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      ) || 0;

    setStats({
      users: users.count || 0,
      conferences: conferences.count || 0,
      submissions: submissions.count || 0,
      revenue,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <RoleGuard adminOnly={true}>

      <div className="space-y-8 max-w-7xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            Reports & Analytics
          </h1>

          <p className="text-muted-foreground mt-1">
            Platform performance overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <ReportCard
            title="Total Users"
            value={stats.users}
            icon={<Users />}
            color="blue"
          />

          <ReportCard
            title="Conferences"
            value={stats.conferences}
            icon={<Calendar />}
            color="purple"
          />

          <ReportCard
            title="Submissions"
            value={stats.submissions}
            icon={<TrendingUp />}
            color="orange"
          />

          <ReportCard
            title="Revenue"
            value={`₹${stats.revenue}`}
            icon={<CreditCard />}
            color="green"
          />

        </div>

        {/* Summary */}
        <Card className="p-6 space-y-4">

          <h2 className="text-xl font-semibold">
            System Summary
          </h2>

          {loading ? (

            <p className="text-sm text-muted-foreground">
              Loading report summary...
            </p>

          ) : (

            <div className="space-y-2 text-sm">

              <SummaryItem
                label="Platform Status"
                value="Healthy"
                color="green"
              />

              <SummaryItem
                label="Growth"
                value="Stable"
                color="blue"
              />

              <SummaryItem
                label="Payment System"
                value="Operational"
                color="green"
              />

              <SummaryItem
                label="Submissions Rate"
                value={
                  stats.submissions > 0
                    ? "Active"
                    : "Low"
                }
                color="orange"
              />

            </div>

          )}

        </Card>

      </div>

    </RoleGuard>
  );
}

/* Stat Card */
function ReportCard({
  title,
  value,
  icon,
  color,
}: any) {

  const colors: any = {
    blue: "bg-info-surface text-info border border-info/30",
    purple: "bg-primary/10 text-primary border border-primary/20",
    orange: "bg-warning-surface text-warning border border-warning/30",
    green: "bg-success-surface text-success border border-success/30",
  };

  return (
    <Card className="p-5">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <p className="text-2xl font-bold">
            {value}
          </p>
        </div>

        <div
          className={`p-3 rounded-lg ${colors[color]}`}
        >
          {icon}
        </div>

      </div>

    </Card>
  );
}

/* Summary Line */
function SummaryItem({
  label,
  value,
  color,
}: any) {

  const colors: any = {
    green: "text-success bg-success-surface border border-success/30",
    blue: "text-info bg-info-surface border border-info/30",
    orange: "text-warning bg-warning-surface border border-warning/30",
  };

  return (
    <div className="flex justify-between">

      <span className="text-muted-foreground">
        {label}
      </span>

      <Badge className={colors[color]}>
        {value}
      </Badge>

    </div>
  );
}
