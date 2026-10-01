"use client";

/**
 * Confairo — Phase 3C: PublishVerificationDialog
 *
 * Displayed when an unverified conference owner attempts to publish a conference.
 * Explains the institutional verification requirement and provides an actionable CTA
 * to open the VerificationRequestDialog without dead-ending the organizer.
 *
 * Security:
 *   - Purely presentation / guidance dialog; does NOT bypass server publication checks
 *   - Only opened when POST /api/organizer/publish explicitly returns 403
 *     with "Organizer verification required"
 *   - Never auto-publishes conferences
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

interface PublishVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conferenceTitle?: string;
  onStartVerification: () => void;
}

export function PublishVerificationDialog({
  open,
  onOpenChange,
  conferenceTitle,
  onStartVerification,
}: PublishVerificationDialogProps) {
  function handleStartVerification() {
    onOpenChange(false);
    onStartVerification();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <DialogTitle>Institutional Verification Required</DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 text-sm leading-relaxed pt-2">
            {conferenceTitle ? (
              <>
                The conference owner must verify their institutional affiliation before{" "}
                <strong className="text-slate-900">{conferenceTitle}</strong> can be published.
              </>
            ) : (
              "To publish an academic conference on Confairo, the conference owner must verify their institutional affiliation."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1.5">
          <p className="font-medium text-slate-800">Why is this required?</p>
          <p>
            Verification helps maintain trust in the academic conference community by confirming
            an organizer&apos;s institutional affiliation.
          </p>
          <p className="text-slate-500 pt-0.5">
            Your primary Confairo login email will not be changed.
          </p>
        </div>

        <DialogFooter className="pt-2 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartVerification}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Verify Institutional Affiliation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
