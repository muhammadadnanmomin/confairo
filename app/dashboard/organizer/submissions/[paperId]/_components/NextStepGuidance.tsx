"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

/* ─── Props ─── */
interface NextStepGuidanceProps {
  paper: any;
  reviewCount: number;
}

/* ─── Component ─── */
export default function NextStepGuidance({ paper, reviewCount }: NextStepGuidanceProps) {
  const isFinalDecision = paper.status === "accepted" || paper.status === "rejected";
  const hasReviewer = !!paper.reviewer_id;
  const hasReviews = reviewCount > 0;
  const isFlagged = paper.plagiarism_status === "flagged";

  // Determine state
  let icon: React.ReactNode;
  let text: string;
  let bgClass: string;
  let textClass: string;
  let borderClass: string;

  if (isFinalDecision) {
    // Success — finalized
    icon = paper.status === "accepted"
      ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
      : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    text = paper.status === "accepted"
      ? "This paper has been accepted — further reviewing is locked."
      : "This paper has been rejected — further reviewing is locked.";
    bgClass = paper.status === "accepted" ? "bg-success-surface" : "bg-destructive-surface";
    textClass = paper.status === "accepted" ? "text-success" : "text-destructive";
    borderClass = paper.status === "accepted" ? "border-success/30" : "border-destructive/30";
  } else if (paper.status === "resubmitted") {
    // Info — resubmitted, needs re-review
    icon = <Info className="h-4 w-4 text-info flex-shrink-0" />;
    text = `Revised paper (v${paper.revision_number}) received — re-review or make a decision.`;
    bgClass = "bg-info-surface";
    textClass = "text-info";
    borderClass = "border-info/30";
  } else if (hasReviews && !isFinalDecision) {
    // Warning — reviews ready, needs decision
    icon = <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />;
    text = `${reviewCount} review${reviewCount > 1 ? "s" : ""} submitted — make a final decision or request revisions.`;
    bgClass = "bg-warning-surface";
    textClass = "text-warning";
    borderClass = "border-warning/30";
  } else if (hasReviewer && !hasReviews) {
    // Info — waiting
    icon = <ArrowRight className="h-4 w-4 text-info flex-shrink-0" />;
    text = "Waiting for reviewer feedback, or run AI analysis while you wait.";
    bgClass = "bg-info-surface";
    textClass = "text-info";
    borderClass = "border-info/30";
  } else {
    // Default — no reviewer
    icon = <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />;
    text = "Assign a reviewer or analyze this paper using AI.";
    bgClass = "bg-accent/60";
    textClass = "text-foreground";
    borderClass = "border-border";
  }

  return (
    <div className="space-y-2">
      {/* Main guidance */}
      <div className={`${bgClass} border ${borderClass} rounded-lg px-4 py-3 flex items-center gap-3`}>
        {icon}
        <div className="flex-1">
          <p className={`text-sm font-medium ${textClass}`}>
            {!isFinalDecision && <span className="font-semibold">Next Step: </span>}
            {text}
          </p>
        </div>
      </div>

      {/* Similarity flag warning — separate visual */}
      {isFlagged && !isFinalDecision && (
        <div className="bg-destructive-surface border border-destructive/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive font-medium">
            Similarity flagged — review carefully before making a decision.
          </span>
        </div>
      )}
    </div>
  );
}
