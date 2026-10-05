"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, CheckCircle2, AlertTriangle, Clock, Loader2 } from "lucide-react";

interface SimilarityReviewPanelProps {
  paper: any;
  plagiarismStatus: string;
  onStatusChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  plagiarismNote: string;
  onNoteChange: (value: string) => void;
}

export default function SimilarityReviewPanel({
  paper, plagiarismStatus, onStatusChange, onSave, saving, plagiarismNote, onNoteChange,
}: SimilarityReviewPanelProps) {
  const st = paper.plagiarism_status;
  const statusStyle = st === "passed" ? "bg-success-surface text-success border-success/30"
    : st === "flagged" ? "bg-destructive-surface text-destructive border-destructive/30"
    : st === "checking" ? "bg-info-surface text-info border-info/30"
    : "bg-warning-surface text-warning border-warning/30";
  const statusIcon = st === "passed" ? <CheckCircle2 className="h-4 w-4" />
    : st === "flagged" ? <AlertTriangle className="h-4 w-4" />
    : st === "checking" ? <Loader2 className="h-4 w-4 animate-spin" />
    : <Clock className="h-4 w-4" />;
  const statusLabel = st === "pending" || !st ? "Not analyzed yet" : st;

  return (
    <Card className="p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Similarity Review
      </h3>
      <div className={`rounded-md p-3 text-sm flex items-center gap-2 border ${statusStyle}`}>
        {statusIcon}
        Current Status: <strong className="ml-1">{statusLabel}</strong>
      </div>
      {st === "flagged" && (
        <div className="bg-destructive-surface border border-destructive/30 rounded-md p-3 text-sm text-destructive">
          ⚠ This submission is flagged for similarity. Review carefully before acceptance.
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">Update Status</label>
          <select value={plagiarismStatus} onChange={e => onStatusChange(e.target.value)}
            className="w-full cursor-pointer border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="pending">Not Analyzed</option>
            <option value="checking">Checking</option>
            <option value="passed">Passed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button size="sm" disabled={saving || plagiarismStatus === paper.plagiarism_status} onClick={onSave}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving…</> : "Update Status"}
          </Button>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Similarity Notes (optional)</label>
        <Textarea value={plagiarismNote} onChange={e => onNoteChange(e.target.value)}
          placeholder="Add notes about the similarity review…" rows={2} className="text-sm" />
        <p className="text-xs text-muted-foreground mt-1">Notes are stored locally and will be saved when the database column is added.</p>
      </div>
    </Card>
  );
}
