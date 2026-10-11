"use client";

import { CheckCircle2, Clock } from "lucide-react";

/* ─── StepPill ─── */
function StepPill({
  label,
  done,
  active,
  variant,
}: {
  label: string;
  done: boolean;
  active?: boolean;
  variant?: "green" | "red" | "orange" | "purple";
}) {
  const base = done
    ? variant === "red" ? "bg-destructive-surface text-destructive border-destructive/20"
      : variant === "green" ? "bg-success-surface text-success border-success/20"
        : variant === "orange" ? "bg-warning-surface text-warning border-warning/20"
          : variant === "purple" ? "bg-primary/10 text-primary border-primary/20"
            : "bg-info-surface text-info border-info/20"
    : "bg-muted text-muted-foreground border-border";

  return (
    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${base} ${active ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}>
      {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  );
}

/* ─── Connector ─── */
function StepConnector({ done }: { done: boolean }) {
  return (
    <div className={`hidden sm:block w-6 h-0.5 ${done ? "bg-primary/30" : "bg-muted"} rounded-full`} />
  );
}

/* ─── Props ─── */
interface ReviewProgressTrackerProps {
  paper: any;
  reviewCount: number;
}

/* ─── Component ─── */
export default function ReviewProgressTracker({ paper, reviewCount }: ReviewProgressTrackerProps) {
  const isFinalDecision = paper.status === "accepted" || paper.status === "rejected";
  const hasReviews = reviewCount > 0;
  const isReviewing = !isFinalDecision && !hasReviews && paper.status !== "revision_required";

  return (
    <div className="flex items-center flex-wrap gap-2 px-1 py-3">
      <StepPill label="Submitted" done={!!paper.created_at} />
      <StepConnector done={!!paper.reviewer_id} />
      <StepPill label="Assigned to You" done={!!paper.reviewer_id} />
      <StepConnector done={hasReviews || isReviewing} />
      <StepPill
        label={hasReviews ? `Reviewed (${reviewCount})` : "Reviewing"}
        done={hasReviews}
        active={isReviewing}
      />
      {paper.revision_number > 1 && (
        <>
          <StepConnector done={true} />
          <StepPill
            label={`Revision v${paper.revision_number}`}
            done={true}
            variant="orange"
          />
        </>
      )}
      <StepConnector done={isFinalDecision} />
      <StepPill
        label={paper.status === "rejected" ? "Rejected" : paper.status === "accepted" ? "Accepted" : "Decision"}
        done={isFinalDecision}
        variant={paper.status === "rejected" ? "red" : paper.status === "accepted" ? "green" : undefined}
      />
    </div>
  );
}
