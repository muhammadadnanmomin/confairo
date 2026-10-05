"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";

/* ─── Sub-components ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: "Submitted", cls: "bg-muted text-muted-foreground border-border" },
    under_review: { label: "Under Review", cls: "bg-info-surface text-info border-info/30" },
    resubmitted: { label: "Resubmitted", cls: "bg-accent text-accent-foreground border-border" },
    revision_required: { label: "Revision Required", cls: "bg-warning-surface text-warning border-warning/30" },
    accepted: { label: "Accepted", cls: "bg-success-surface text-success border-success/30" },
    rejected: { label: "Rejected", cls: "bg-destructive-surface text-destructive border-destructive/30" },
    final_submitted: { label: "Final Submitted", cls: "bg-success-surface text-success border-success/30" },
  };
  const s = map[status] || { label: status || "Not Analyzed", cls: "bg-muted text-muted-foreground border-border" };
  return <Badge className={s.cls}>{s.label}</Badge>;
}

function SimilarityBadge({ status }: { status?: string }) {
  if (status === "passed") return <Badge className="bg-success-surface text-success border-success/30">Passed</Badge>;
  if (status === "flagged") return <Badge className="bg-destructive-surface text-destructive border-destructive/30">Flagged</Badge>;
  if (status === "checking") return <Badge className="bg-info-surface text-info border-info/30">Checking</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border">Not Analyzed</Badge>;
}

/* ─── Props ─── */
interface PaperOverviewCardProps {
  paper: any;
}

/* ─── Component ─── */
export default function PaperOverviewCard({ paper }: PaperOverviewCardProps) {
  const title = paper.title || `Paper #${paper.id.slice(0, 8)}`;

  return (
    <Card className="p-5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
            {paper.revision_number > 1 && (
              <Badge className="bg-accent text-accent-foreground border-border text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Revision v{paper.revision_number}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {paper.conferences?.title}
          </p>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Paper ID</p>
          <p className="text-sm font-medium text-foreground mt-0.5 font-mono">{paper.id?.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{new Date(paper.created_at).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
          <div className="mt-0.5"><StatusBadge status={paper.status} /></div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Similarity</p>
          <div className="mt-0.5"><SimilarityBadge status={paper.plagiarism_status} /></div>
        </div>
      </div>

      {/* Date row */}
      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground mt-3">
        {paper.reviewed_at && <span>Last reviewed: {new Date(paper.reviewed_at).toLocaleDateString()}</span>}
        {paper.decision_at && <span>Decision: {new Date(paper.decision_at).toLocaleDateString()}</span>}
        {paper.revision_number > 1 && <span>Current revision: v{paper.revision_number}</span>}
      </div>
    </Card>
  );
}

export { StatusBadge, SimilarityBadge };
