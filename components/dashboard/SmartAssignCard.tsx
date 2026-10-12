"use client";

import { useState, useRef, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  UserCheck,
  Users,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Zap,
  Crown,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */
interface RecommendedReviewer {
  reviewer_id: string;
  score: number;
  reason: string;
  reviewer_name: string;
  reviewer_email: string;
  current_workload: number;
}

interface SmartAssignCardProps {
  submissionId: string;
  /** Called when user clicks "Assign" on a single reviewer */
  onAssign: (reviewerId: string) => Promise<void>;
  /** Called for "Assign All" — receives array of reviewer IDs (top 3) */
  onAssignAll?: (reviewerIds: string[]) => Promise<void>;
  /** Currently assigned reviewer ID (to highlight/disable) */
  currentReviewerId?: string | null;
}

/* ─── Score color helpers ──────────────────────────────────── */
function scoreColor(score: number) {
  if (score >= 80) return { bar: "bg-success", text: "text-success", bg: "bg-success-surface", ring: "ring-success/20" };
  if (score >= 60) return { bar: "bg-info", text: "text-info", bg: "bg-info-surface", ring: "ring-info/20" };
  if (score >= 40) return { bar: "bg-warning", text: "text-warning", bg: "bg-warning-surface", ring: "ring-warning/20" };
  return { bar: "bg-destructive", text: "text-destructive", bg: "bg-destructive-surface", ring: "ring-destructive/20" };
}

function rankBadge(index: number) {
  if (index === 0)
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-surface text-warning border border-warning/30">
        <Crown className="h-2.5 w-2.5" /> #1
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
      #{index + 1}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function SmartAssignCard({
  submissionId,
  onAssign,
  onAssignAll,
  currentReviewerId,
}: SmartAssignCardProps) {
  const [loading, setLoading] = useState(false);
  const [reviewers, setReviewers] = useState<RecommendedReviewer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assigningAll, setAssigningAll] = useState(false);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  const resultRef = useRef<HTMLDivElement>(null);

  /* ─── Fetch Suggestions ──────────────────────────────────── */
  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    setReviewers([]);
    setAssignedIds(new Set());

    try {
      const res = await fetch("/api/ai/smart-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });

      const data = await res.json();

      if (!res.ok && !data.success) {
        if (data.error === "AI_LIMIT_REACHED") {
          setError(`AI analysis limit reached (${data.usage?.used ?? "?"}/${data.usage?.total ?? "?"} used). Upgrade to continue.`);
          return;
        }
        throw new Error(data.error || "Failed to get suggestions");
      }

      if (!data.success) {
        throw new Error(data.error || "No suggestions returned");
      }

      setReviewers(data.reviewers || []);
      setModel(data.model ?? null);
      setSource(data.source ?? null);
      setFallback(data.fallback ?? false);

      // Broadcast usage update
      if (data.usage) {
        window.dispatchEvent(
          new CustomEvent("ai-usage-update", { detail: data.usage })
        );
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Check if reviewer is a duplicate ────────────────────── */
  function isDuplicate(reviewerId: string): boolean {
    return (
      String(currentReviewerId) === String(reviewerId) ||
      assignedIds.has(reviewerId)
    );
  }

  /* ─── Assign Single ──────────────────────────────────────── */
  async function handleAssign(reviewerId: string) {
    // Prevent duplicate assignment
    if (isDuplicate(reviewerId)) return;
    // Prevent concurrent assignments
    if (assigning || assigningAll) return;

    setAssigning(reviewerId);
    try {
      await onAssign(reviewerId);
      setAssignedIds((prev) => new Set(prev).add(reviewerId));
    } catch (err) {
      console.error("Assignment failed:", err);
    } finally {
      setAssigning(null);
    }
  }

  /* ─── Assign All ─────────────────────────────────────────── */
  async function handleAssignAll() {
    if (!onAssignAll || reviewers.length === 0) return;
    // Prevent concurrent assignments
    if (assigning || assigningAll) return;

    // Filter out already-assigned and current reviewer
    const eligibleIds = reviewers
      .slice(0, 3)
      .map((r) => r.reviewer_id)
      .filter((id) => !isDuplicate(id));

    if (eligibleIds.length === 0) return;

    setAssigningAll(true);
    try {
      await onAssignAll(eligibleIds);
      setAssignedIds((prev) => {
        const next = new Set(prev);
        eligibleIds.forEach((id) => next.add(id));
        return next;
      });
    } catch (err) {
      console.error("Assign all failed:", err);
    } finally {
      setAssigningAll(false);
    }
  }

  // Compute whether all top candidates are already assigned
  const allTopAssigned = reviewers
    .slice(0, 3)
    .every((r) => isDuplicate(r.reviewer_id));

  /* ─── Initial State ──────────────────────────────────────── */
  if (reviewers.length === 0 && !loading && !error) {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>🤖 AI Reviewer Suggestions</span>
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-lg border border-dashed border-primary/20">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1 text-center max-w-xs">
            Automatically match papers with the most relevant reviewers
          </p>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">
            Analyzes paper content and matches it with reviewer expertise and past assignments
          </p>
          <Button
            onClick={fetchSuggestions}
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            ⚡ Smart Assign Reviewers
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Uses 1 AI analysis
          </p>
        </div>
      </Card>
    );
  }

  /* ─── Loading State ──────────────────────────────────────── */
  if (loading) {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>🤖 AI Reviewer Suggestions</span>
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30/40 animate-ping" />
          </div>
          <p className="text-sm text-muted-foreground mt-5 font-medium">Finding best reviewers…</p>
          <p className="text-xs text-muted-foreground mt-1">Analyzing paper content &amp; reviewer expertise</p>
        </div>
      </Card>
    );
  }

  /* ─── Error State ────────────────────────────────────────── */
  if (error) {
    const isAccessError = error.toLowerCase().includes("access restricted") || error.toLowerCase().includes("permission");
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>🤖 AI Reviewer Suggestions</span>
          </h2>
        </div>

        <div className={`border rounded-lg p-4 ${isAccessError ? "bg-warning-surface border-warning/30" : "bg-destructive-surface border-destructive/30"}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isAccessError ? "text-warning" : "text-destructive"}`} />
            <div>
              <p className={`text-sm font-medium ${isAccessError ? "text-warning" : "text-destructive"}`}>
                {isAccessError ? "Access Restricted" : "Suggestion Failed"}
              </p>
              <p className={`text-sm mt-1 ${isAccessError ? "text-warning" : "text-destructive"}`}>
                {isAccessError ? "You don't have access to assign reviewers." : error}
              </p>
            </div>
          </div>
        </div>

        {!isAccessError && (
          <div className="flex justify-center">
            <Button
              onClick={fetchSuggestions}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        )}
      </Card>
    );
  }

  /* ─── Result State ───────────────────────────────────────── */
  return (
    <>
      {/* Keyframes for fade-in animation */}
      <style>{`
        @keyframes smartFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Card className="p-5 space-y-4 overflow-hidden" ref={resultRef}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>🤖 AI Reviewer Suggestions</span>
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-primary text-[10px] tracking-wider uppercase border border-primary/20">
              Top Reviewer Matches
            </Badge>
            <Button
              onClick={fetchSuggestions}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={loading}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Fallback warning */}
        {fallback && (
          <div className="bg-warning-surface border border-warning/30 rounded-md px-3 py-2 text-xs text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            AI temporarily unavailable — showing keyword-based suggestions.
          </div>
        )}

        {/* Reviewer List */}
        <div className="space-y-3">
          {reviewers.map((r, index) => {
            const sc = scoreColor(r.score);
            const isCurrentReviewer = currentReviewerId === r.reviewer_id;
            const isAssigned = assignedIds.has(r.reviewer_id);
            const isAssigningThis = assigning === r.reviewer_id;

            return (
              <div
                key={r.reviewer_id}
                className="opacity-0 border rounded-lg p-4 hover:shadow-sm transition-all duration-200"
                style={{
                  animation: `smartFadeIn 0.4s ease-out ${index * 100}ms forwards`,
                  borderColor: isCurrentReviewer ? "#93c5fd" : undefined,
                  backgroundColor: isCurrentReviewer ? "#eff6ff" : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {r.reviewer_name?.charAt(0)?.toUpperCase() || "R"}
                      </div>
                      <div className="absolute -top-1 -right-1">
                        {rankBadge(index)}
                      </div>
                    </div>

                    {/* Name + Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.reviewer_name}
                        </p>
                        {isCurrentReviewer && (
                          <Badge className="bg-info-surface text-info border border-info/30 text-[10px]">
                            Currently Assigned
                          </Badge>
                        )}
                      </div>

                      {r.reviewer_email && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{r.reviewer_email}</p>
                      )}

                      {/* Score Bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${sc.bar} transition-all duration-700 ease-out`}
                            style={{ width: `${r.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-9 text-right ${sc.text}`}>
                          {r.score}%
                        </span>
                      </div>

                      {/* Match label + workload */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          📋 {r.current_workload} paper{r.current_workload !== 1 ? "s" : ""} assigned
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium`}>
                          {r.score >= 80 ? "Best Match" : r.score >= 60 ? "Strong Match" : r.score >= 40 ? "Fair Match" : "Weak Match"}
                        </span>
                      </div>

                      {/* Why this match? — expandable */}
                      <details className="mt-2 group">
                        <summary className="text-[11px] text-primary cursor-pointer hover:text-primary-hover transition-colors select-none">
                          Why this match?
                        </summary>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed pl-1 border-l-2 border-primary/20">
                          {r.reason || "Relevant experience in similar research topics"}
                        </p>
                      </details>
                    </div>
                  </div>

                  {/* Right: Assign button */}
                  <div className="flex-shrink-0 pt-1">
                    {isAssigned || isCurrentReviewer ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className={`gap-1.5 ${
                          isCurrentReviewer && !isAssigned
                            ? "border-info/30 text-info bg-info-surface"
                            : "border-success/30 text-success bg-success-surface"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isCurrentReviewer && !isAssigned ? "Current" : "Assigned"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssign(r.reviewer_id)}
                        disabled={!!assigning || assigningAll}
                        className="gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
                      >
                        {isAssigningThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        Assign
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign All Button */}
        {onAssignAll && reviewers.length > 1 && !allTopAssigned && (
          <div
            className="opacity-0 pt-1"
            style={{ animation: `smartFadeIn 0.4s ease-out ${reviewers.length * 100 + 100}ms forwards` }}
          >
            <Button
              onClick={handleAssignAll}
              disabled={assigningAll || !!assigning || allTopAssigned}
              variant="outline"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-accent"
            >
              {assigningAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {assigningAll
                ? "Assigning..."
                : `Assign Best Reviewer`}
            </Button>
          </div>
        )}

        {/* Footer meta */}
        <div
          className="opacity-0 border-t border-border pt-3"
          style={{ animation: `smartFadeIn 0.4s ease-out ${reviewers.length * 100 + 200}ms forwards` }}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              AI-powered analysis
            </span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
