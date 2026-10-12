"use client";

import { Lock, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Shown when a user does NOT have access to proceedings.
 */
export default function ProceedingsLocked() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      {/* Icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-surface">
        <Lock className="h-8 w-8 text-warning" />
      </div>

      {/* Heading */}
      <h2 className="text-xl font-semibold text-foreground">
        🔒 Proceedings Locked
      </h2>

      {/* Description */}
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
        Only participants who presented papers and completed payment, or
        registered attendees with paid registration, can access conference
        proceedings.
      </p>

      {/* Hint */}
      <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-warning/30 bg-warning-surface px-4 py-3 text-xs text-warning">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Access is automatically granted once your paper is accepted, payment
          is completed, and your presentation is marked as done.
        </span>
      </div>
    </Card>
  );
}
