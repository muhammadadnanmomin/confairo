"use client";

import { useEffect, useState, useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import {
    Landmark,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Clock,
    Pencil,
    Loader2,
    Building2,
    CreditCard,
    Info,
} from "lucide-react";

// ── Validation ──────────────────────────────────────────────────────

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

interface FormErrors {
    account_holder_name?: string;
    account_number?: string;
    confirm_account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
}

function validateForm(form: Record<string, string>): FormErrors {
    const errors: FormErrors = {};

    if (!form.account_holder_name?.trim())
        errors.account_holder_name = "Account holder name is required";

    const accNum = form.account_number?.trim() || "";
    if (!accNum) {
        errors.account_number = "Account number is required";
    } else if (!/^\d+$/.test(accNum)) {
        errors.account_number = "Account number must contain only digits";
    } else if (accNum.length < 9 || accNum.length > 18) {
        errors.account_number = "Account number must be 9–18 digits";
    }

    if (!form.confirm_account_number?.trim()) {
        errors.confirm_account_number = "Please confirm your account number";
    } else if (accNum && accNum !== form.confirm_account_number?.trim()) {
        errors.confirm_account_number = "Account numbers do not match";
    }

    const ifsc = form.ifsc_code?.trim().toUpperCase() || "";
    if (!ifsc) {
        errors.ifsc_code = "IFSC code is required";
    } else if (!IFSC_REGEX.test(ifsc)) {
        errors.ifsc_code = "Invalid format (e.g., SBIN0001234)";
    }

    if (!form.bank_name?.trim()) errors.bank_name = "Bank name is required";

    return errors;
}

// ── Types ───────────────────────────────────────────────────────────

interface BankDetails {
    id: string;
    account_holder_name: string;
    account_number_masked: string;
    ifsc_code: string;
    bank_name: string;
    branch_name: string | null;
    is_verified: boolean;
    razorpay_account_id: string | null;
    created_at: string;
    updated_at: string;
}

// ── Page ────────────────────────────────────────────────────────────

export default function OrganizerBankDetailsPage() {
    const { profile } = useProfile();
    const supabase = createClient();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [editing, setEditing] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    // Form state
    const [form, setForm] = useState({
        account_holder_name: "",
        account_number: "",
        confirm_account_number: "",
        ifsc_code: "",
        bank_name: "",
        branch_name: "",
    });

    // ── Fetch existing bank details ──
    const fetchBankDetails = useCallback(async () => {
        if (!profile) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/organizer/bank-details", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            const json = await res.json();

            if (json.bank) {
                setBankDetails(json.bank);
                setEditing(false);
            } else {
                setBankDetails(null);
                setEditing(true); // show form if no details exist
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Failed to load bank details",
            });
        }

        setLoading(false);
    }, [profile]);

    useEffect(() => {
        fetchBankDetails();
    }, [fetchBankDetails]);

    // ── Handle form change ──
    function handleChange(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        // Clear the error for this field as user types
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    }

    // ── Enter edit mode with pre-filled data ──
    function startEditing() {
        if (bankDetails) {
            setForm({
                account_holder_name: bankDetails.account_holder_name,
                account_number: "",
                confirm_account_number: "",
                ifsc_code: bankDetails.ifsc_code,
                bank_name: bankDetails.bank_name,
                branch_name: bankDetails.branch_name || "",
            });
        }
        setErrors({});
        setEditing(true);
    }

    // ── Save / Update ──
    async function handleSubmit() {
        const validationErrors = validateForm(form);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast({
                variant: "destructive",
                title: "Please fix the errors below",
            });
            return;
        }

        setSaving(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast({ variant: "destructive", title: "Session expired" });
                setSaving(false);
                return;
            }

            const res = await fetch("/api/organizer/bank-details", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(form),
            });

            const json = await res.json();

            if (!res.ok) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: json.error || "Failed to save bank details",
                });
                setSaving(false);
                return;
            }

            toast({ title: "Bank details saved successfully ✓" });

            // Reset form and reload
            setForm({
                account_holder_name: "",
                account_number: "",
                confirm_account_number: "",
                ifsc_code: "",
                bank_name: "",
                branch_name: "",
            });

            await fetchBankDetails();
        } catch {
            toast({
                variant: "destructive",
                title: "Something went wrong",
            });
        }

        setSaving(false);
    }

    // ── Render ────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bank Details</h1>
                <p className="text-muted-foreground mt-1">
                    Add your bank account for receiving conference fee settlements
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Loading bank details…</p>
                </div>
            )}

            {/* ── Display Mode ── */}
            {!loading && bankDetails && !editing && (
                <div className="space-y-5">
                    {/* Status Card */}
                    <Card className="overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b bg-muted/30 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                                    <Landmark className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <span className="font-semibold text-foreground block">
                                        {bankDetails.bank_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Settlement Bank Account
                                    </span>
                                </div>
                            </div>

                            {bankDetails.is_verified ? (
                                <Badge className="bg-success-surface text-success border border-success/30 gap-1 self-start sm:self-auto">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                </Badge>
                            ) : (
                                <Badge className="bg-warning-surface text-warning border border-warning/30 gap-1 self-start sm:self-auto">
                                    <Clock className="h-3 w-3" /> Pending Verification
                                </Badge>
                            )}
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DetailItem
                                    label="Account Holder"
                                    value={bankDetails.account_holder_name}
                                />
                                <DetailItem
                                    label="Account Number"
                                    value={bankDetails.account_number_masked}
                                    mono
                                />
                                <DetailItem
                                    label="IFSC Code"
                                    value={bankDetails.ifsc_code}
                                    mono
                                />
                                <DetailItem
                                    label="Bank Name"
                                    value={bankDetails.bank_name}
                                />
                                {bankDetails.branch_name && (
                                    <DetailItem
                                        label="Branch"
                                        value={bankDetails.branch_name}
                                    />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button variant="outline" onClick={startEditing} className="gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit Bank Details
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Info Banner */}
                    {!bankDetails.is_verified && (
                        <div className="flex items-start gap-3 bg-info-surface border border-info/30 rounded-xl px-4 py-3">
                            <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Verification in progress
                                </p>
                                <p className="text-xs text-info mt-0.5">
                                    Your bank details will be verified before settlements are enabled.
                                    This is a one-time process.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Razorpay Route notice */}
                    <div className="border border-border rounded-xl p-4 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 text-success" />
                            <span>
                                Your bank details are encrypted and stored securely.
                                Settlements will be processed via Razorpay Route.
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Form Mode (Add / Edit) ── */}
            {!loading && editing && (
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2.5 p-5 border-b bg-muted/30">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <span className="font-semibold text-foreground block">
                                {bankDetails ? "Update Bank Details" : "Add Bank Details"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Provide your bank account for conference fee settlements
                            </span>
                        </div>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Account Holder Name */}
                        <FormField
                            label="Account Holder Name"
                            placeholder="Name as per bank records"
                            value={form.account_holder_name}
                            onChange={(v) => handleChange("account_holder_name", v)}
                            error={errors.account_holder_name}
                            required
                        />

                        {/* Account Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                label="Account Number"
                                placeholder="Enter account number"
                                value={form.account_number}
                                onChange={(v) => handleChange("account_number", v)}
                                error={errors.account_number}
                                type="password"
                                required
                            />

                            <FormField
                                label="Confirm Account Number"
                                placeholder="Re-enter account number"
                                value={form.confirm_account_number}
                                onChange={(v) => handleChange("confirm_account_number", v)}
                                error={errors.confirm_account_number}
                                required
                            />
                        </div>

                        {/* IFSC Code */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                label="IFSC Code"
                                placeholder="e.g., SBIN0001234"
                                value={form.ifsc_code}
                                onChange={(v) => handleChange("ifsc_code", v.toUpperCase())}
                                error={errors.ifsc_code}
                                maxLength={11}
                                required
                            />

                            <FormField
                                label="Bank Name"
                                placeholder="e.g., State Bank of India"
                                value={form.bank_name}
                                onChange={(v) => handleChange("bank_name", v)}
                                error={errors.bank_name}
                                required
                            />
                        </div>

                        {/* Branch Name (optional) */}
                        <FormField
                            label="Branch Name"
                            placeholder="e.g., Connaught Place, New Delhi (optional)"
                            value={form.branch_name}
                            onChange={(v) => handleChange("branch_name", v)}
                        />

                        <Separator />

                        {/* Security Notice */}
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-success" />
                            <span>
                                Your bank details are encrypted and stored securely.
                                Account numbers are never displayed in full — only the last 4 digits are shown.
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground h-11 font-semibold"
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        {bankDetails ? "Update Bank Details" : "Save Bank Details"}
                                    </>
                                )}
                            </Button>

                            {bankDetails && (
                                <Button
                                    variant="outline"
                                    className="sm:w-auto"
                                    onClick={() => {
                                        setEditing(false);
                                        setErrors({});
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}

// ── Sub-Components ──────────────────────────────────────────────────

function DetailItem({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p
                className={`text-sm font-medium text-foreground mt-0.5 ${mono ? "font-mono tracking-wider" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}

function FormField({
    label,
    placeholder,
    value,
    onChange,
    error,
    type = "text",
    maxLength,
    required,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    type?: string;
    maxLength?: number;
    required?: boolean;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            <Input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={maxLength}
                className={`${error
                        ? "border-destructive/40 focus-visible:ring-destructive/30"
                        : ""
                    }`}
            />
            {error && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </p>
            )}
        </div>
    );
}
