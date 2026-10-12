"use client";

/**
 * Confairo — Phase 3B: VerificationRequestDialog
 *
 * Reusable dialog component for initiating institutional email verification.
 * Allows organizers to submit their institutional email (.edu, university domain)
 * to receive a 24-hour single-use verification link.
 *
 * Security:
 *   - Authenticated via session Bearer token
 *   - Never submits user_id, raw tokens, or internal credentials
 *   - Client performs format validation without arbitrary domain restrictions
 *   - Server remains authoritative
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useVerification } from "@/lib/verification/useVerification";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldCheck,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface VerificationRequestDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const supabase = createClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function VerificationRequestDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}: VerificationRequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const {
    isVerified,
    institutionName: currentInstitution,
    institutionalEmail: currentVerifiedEmail,
    hasPendingRequest,
    pendingEmail,
    refresh,
  } = useVerification();

  const { toast } = useToast();

  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  // Reset internal states when dialog opens/closes
  function handleOpenChange(newOpen: boolean) {
    setIsOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setErrorMessage(null);
        setIsSubmittedSuccess(false);
        setShowOverrideForm(false);
        setInstitutionalEmail("");
        setInstitutionName("");
      }, 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = institutionalEmail.trim().toLowerCase();
    const nameTrimmed = institutionName.trim();

    if (!emailTrimmed) {
      setErrorMessage("Institutional email is required.");
      return;
    }

    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setErrorMessage("Please enter a valid institutional email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage("Authentication session expired. Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/verification/request-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          institutionalEmail: emailTrimmed,
          institutionName: nameTrimmed || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorDetail =
          data.message || data.error || "Unable to send verification email. Please try again.";
        setErrorMessage(errorDetail);
        setIsSubmitting(false);
        return;
      }

      setIsSubmittedSuccess(true);
      await refresh();
      onSuccess?.();

      toast({
        title: "Verification email sent",
        description: `A verification link has been sent to ${emailTrimmed}.`,
      });
    } catch {
      setErrorMessage("Network error. Could not reach the verification service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[480px]">
        {/* ======================================================== */}
        {/* CASE 1: ALREADY VERIFIED                                 */}
        {/* ======================================================== */}
        {isVerified ? (
          <div className="py-2 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <DialogTitle>Institutional Affiliation Verified</DialogTitle>
              </div>
              <DialogDescription>
                Your institutional affiliation is verified. You are authorized to publish academic conferences.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm text-foreground">
              {currentInstitution && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Institution</span>
                  <span className="font-medium text-foreground">{currentInstitution}</span>
                </div>
              )}
              {currentVerifiedEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Institutional Email</span>
                  <span className="font-medium text-foreground">{currentVerifiedEmail}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-success-surface text-success border-success/30">
                  Verified
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : isSubmittedSuccess ? (
          /* ======================================================== */
          /* CASE 2: SUCCESS POST-SUBMISSION                           */
          /* ======================================================== */
          <div className="py-2 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <DialogTitle className="text-foreground">Verification email sent</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground pt-1">
                We sent a verification link to{" "}
                <strong className="text-foreground">{institutionalEmail.trim()}</strong>.
                Check your institutional inbox and click the link to confirm your affiliation.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1.5">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Link expires in 24 hours
              </p>
              <p>
                Verification links are single-use. After confirming, this page will update automatically when you return.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : hasPendingRequest && !showOverrideForm ? (
          /* ======================================================== */
          /* CASE 3: EXISTING PENDING VERIFICATION                    */
          /* ======================================================== */
          <div className="py-2 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-warning">
                <Clock className="h-5 w-5 shrink-0" />
                <DialogTitle className="text-foreground">Verification Pending</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground pt-1">
                A verification link has already been requested for{" "}
                <strong className="text-foreground">{pendingEmail || "your institutional email"}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-warning/30 bg-warning-surface/50 p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Check your institutional inbox for the confirmation email from Confairo.</li>
                <li>Click the verification link in the email.</li>
                <li>Your status will update automatically upon return.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingEmail) setInstitutionalEmail(pendingEmail);
                  setShowOverrideForm(true);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Need to change email or request new link?
              </button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 4: REQUEST FORM                                      */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <DialogTitle>Verify your institutional affiliation</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1">
                Confairo requires institutional affiliation verification for conference organizers before publishing conferences.
                Verification confirms your affiliation using an institutional email address. Your primary Confairo login email will not change.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive-surface p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="inst-email" className="text-xs font-medium text-foreground">
                  Institutional Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inst-email"
                    type="email"
                    placeholder="name@university.edu"
                    value={institutionalEmail}
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9 text-sm"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use your official university or academic institution email address.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inst-name" className="text-xs font-medium text-foreground">
                  Institution Name <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="inst-name"
                  type="text"
                  placeholder="e.g. University of Oxford"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  disabled={isSubmitting}
                  className="text-sm"
                  maxLength={200}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 sm:space-x-2">
              {showOverrideForm && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setShowOverrideForm(false)}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
