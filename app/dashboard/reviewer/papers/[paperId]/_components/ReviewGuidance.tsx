"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  PenLine,
} from "lucide-react";

/* ─── Props ─── */
interface ReviewGuidanceProps {
  paper: any;
  reviewCount: number;
  hasComments: boolean;
}

/* ─── Component ─── */
export default function ReviewGuidance({ paper, reviewCount, hasComments }: ReviewGuidanceProps) {
  const isFinalDecision = paper.status === "accepted" || paper.status === "rejected";
  const canReview = !isFinalDecision &&
    (paper.status === "submitted" || paper.status === "under_review" || paper.status === "resubmitted");
  const isFlagged = paper.plagiarism_status === "flagged";

  let icon: React.ReactNode;
  let text: string;
  let helperText: string | null = null;
  let bgClass: string;
  let textClass: string;
  let borderClass: string;

  if (isFinalDecision) {
    icon = paper.status === "accepted"
      ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
      : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    text = paper.status === "accepted"
      ? "This paper has been accepted — no further reviews needed."
      : "This paper has been rejected — no further reviews needed.";
    bgClass = paper.status === "accepted" ? "bg-success-surface" : "bg-destructive-surface";
    textClass = paper.status === "accepted" ? "text-success" : "text-destructive";
    borderClass = paper.status === "accepted" ? "border-success/20" : "border-destructive/20";
  } else if (paper.status === "revision_required") {
    icon = <RotateCcw className="h-4 w-4 text-warning flex-shrink-0" />;
    text = "Waiting for the author to submit a revised version.";
    bgClass = "bg-warning-surface";
    textClass = "text-warning";
    borderClass = "border-warning/20";
  } else if (paper.status === "resubmitted") {
    icon = <PenLine className="h-4 w-4 text-info flex-shrink-0" />;
    text = `Revised paper (v${paper.revision_number}) received — please review and submit your decision.`;
    helperText = "Focus on strengths, weaknesses, and constructive suggestions";
    bgClass = "bg-info-surface";
    textClass = "text-info";
    borderClass = "border-info/20";
  } else if (canReview && hasComments) {
    icon = <PenLine className="h-4 w-4 text-warning flex-shrink-0" />;
    text = "Complete your review and submit your decision.";
    helperText = "Focus on strengths, weaknesses, and constructive suggestions";
    bgClass = "bg-warning-surface";
    textClass = "text-warning";
    borderClass = "border-warning/20";
  } else if (canReview) {
    icon = <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />;
    text = "Read the paper and submit your review.";
    helperText = "Focus on strengths, weaknesses, and constructive suggestions";
    bgClass = "bg-primary/5";
    textClass = "text-primary";
    borderClass = "border-primary/20";
  } else {
    icon = <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    text = "No review action available at this time.";
    bgClass = "bg-muted";
    textClass = "text-foreground";
    borderClass = "border-border";
  }

  return (
    <div className="space-y-2">
      <div className={`${bgClass} border ${borderClass} rounded-lg px-4 py-3`}>
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex-1">
            <p className={`text-sm font-medium ${textClass}`}>
              {!isFinalDecision && paper.status !== "revision_required" && (
                <span className="font-semibold">Next Step: </span>
              )}
              {text}
            </p>
            {helperText && (
              <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
            )}
          </div>
        </div>
      </div>

      {isFlagged && !isFinalDecision && (
        <div className="bg-destructive-surface border border-destructive/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive font-medium">
            Similarity flagged — review carefully before submitting your decision.
          </span>
        </div>
      )}
    </div>
  );
}
