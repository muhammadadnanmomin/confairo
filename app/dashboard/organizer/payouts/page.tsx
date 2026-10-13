"use client";

import { useEffect, useState, useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

import {
    IndianRupee,
    Wallet,
    Clock,
    CheckCircle2,
    ArrowDownToLine,
    Loader2,
    AlertTriangle,
    Landmark,
    XCircle,
    ArrowRight,
} from "lucide-react";

import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────

interface BalanceSummary {
    totalEarned: number;
    totalWithdrawn: number;
    pendingPayout: number;
    availableBalance: number;
}

interface Payout {
    id: string;
    amount: number;
    status: string;
    notes: string | null;
    admin_notes: string | null;
    created_at: string;
    processed_at: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatINR(n: number) {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// ── Page ────────────────────────────────────────────────────────────

export default function OrganizerPayoutsPage() {
    const { profile } = useProfile();
    const supabase = createClient();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [payouts, setPayouts] = useState<Payout[]>([]);

    // Request payout
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!profile) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/payouts/organizer", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const json = await res.json();
                setBalance(json.balance);
                setPayouts(json.payouts);
            }
        } catch {
            toast({ variant: "destructive", title: "Failed to load payout data" });
        }

        setLoading(false);
    }, [profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function requestPayout() {
        const amountNum = Number(amount);
        if (!amountNum || amountNum <= 0) {
            toast({ variant: "destructive", title: "Enter a valid amount" });
            return;
        }

        setSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/payouts/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ amount: amountNum, notes: notes.trim() || null }),
            });

            const json = await res.json();

            if (!res.ok) {
                toast({ variant: "destructive", title: "Error", description: json.error });
                setSubmitting(false);
                return;
            }

            toast({ title: "Payout request submitted ✓" });
            setShowForm(false);
            setAmount("");
            setNotes("");
            await fetchData();
        } catch {
            toast({ variant: "destructive", title: "Something went wrong" });
        }

        setSubmitting(false);
    }

    // ── Render ──

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
                    <p className="text-muted-foreground mt-1">
                        Request withdrawals of your conference fee earnings
                    </p>
                </div>

                {balance && balance.availableBalance > 0 && !showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-primary hover:bg-primary-hover gap-2 shrink-0"
                    >
                        <ArrowDownToLine className="h-4 w-4" />
                        Request Payout
                    </Button>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Loading payout data…</p>
                </div>
            )}

            {/* Balance Cards */}
            {!loading && balance && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <BalanceCard
                        title="Total Earned"
                        value={`₹${formatINR(balance.totalEarned)}`}
                        icon={IndianRupee}
                        iconBg="bg-success-surface"
                        iconColor="text-success"
                    />
                    <BalanceCard
                        title="Available Balance"
                        value={`₹${formatINR(balance.availableBalance)}`}
                        icon={Wallet}
                        iconBg="bg-primary/10"
                        iconColor="text-primary"
                    />
                    <BalanceCard
                        title="Pending Payout"
                        value={`₹${formatINR(balance.pendingPayout)}`}
                        icon={Clock}
                        iconBg="bg-warning-surface"
                        iconColor="text-warning"
                    />
                    <BalanceCard
                        title="Total Withdrawn"
                        value={`₹${formatINR(balance.totalWithdrawn)}`}
                        icon={CheckCircle2}
                        iconBg="bg-success-surface"
                        iconColor="text-success"
                    />
                </div>
            )}

            {/* Payout Request Form */}
            {!loading && showForm && (
                <Card className="p-5 space-y-4 border-primary/20">
                    <h3 className="font-semibold text-foreground">Request Payout</h3>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                            Amount (₹)
                        </label>
                        <Input
                            type="number"
                            placeholder={`Max: ₹${formatINR(balance?.availableBalance || 0)}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={1}
                            max={balance?.availableBalance || 0}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                            Notes (optional)
                        </label>
                        <Input
                            placeholder="e.g., Monthly settlement"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex items-start gap-2 text-xs text-warning bg-warning-surface/50 border border-warning/30 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                            Payouts are processed manually by the Confairo team.
                            Settlement typically takes 2–3 business days.
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            className="bg-primary hover:bg-primary-hover text-primary-foreground"
                            disabled={submitting || !amount}
                            onClick={requestPayout}
                        >
                            {submitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </Card>
            )}

            {/* Bank Details Link */}
            {!loading && (
                <Link
                    href="/dashboard/organizer/bank-details"
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                            <Landmark className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <span className="font-medium text-foreground text-sm">Bank Details</span>
                            <span className="text-xs text-muted-foreground block">
                                Manage your settlement bank account
                            </span>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Link>
            )}

            {/* Payout History */}
            {!loading && payouts.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="p-4 border-b bg-muted/30">
                        <h3 className="font-semibold text-foreground">Payout History</h3>
                    </div>

                    <div className="divide-y">
                        {payouts.map((p) => (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2">
                                <div className="flex items-center gap-3">
                                    <PayoutStatusBadge status={p.status} />
                                    <div>
                                        <span className="font-semibold text-foreground">
                                            ₹{formatINR(p.amount)}
                                        </span>
                                        {p.notes && (
                                            <span className="text-xs text-muted-foreground ml-2">— {p.notes}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-3">
                                    <span>Requested: {formatDate(p.created_at)}</span>
                                    {p.processed_at && (
                                        <span>Settled: {formatDate(p.processed_at)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {!loading && payouts.length === 0 && (
                <Card className="p-10 text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted mx-auto mb-4">
                        <ArrowDownToLine className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium text-lg">No payouts yet</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                        Once you earn conference fees, you can request payouts from this page.
                    </p>
                </Card>
            )}
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────

function BalanceCard({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
}) {
    return (
        <Card className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
            <div className={`${iconBg} p-3 rounded-lg`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
        </Card>
    );
}

function PayoutStatusBadge({ status }: { status: string }) {
    if (status === "completed")
        return (
            <Badge className="bg-success-surface text-success border-success/30 hover:bg-success-surface text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
        );
    if (status === "processing")
        return (
            <Badge className="bg-info-surface text-info border-info/30 hover:bg-info-surface text-xs gap-1">
                <Loader2 className="h-3 w-3" /> Processing
            </Badge>
        );
    if (status === "failed")
        return (
            <Badge className="bg-destructive-surface text-destructive border-destructive/30 hover:bg-destructive-surface text-xs gap-1">
                <XCircle className="h-3 w-3" /> Failed
            </Badge>
        );
    return (
        <Badge className="bg-warning-surface text-warning border-warning/30 hover:bg-warning-surface text-xs gap-1">
            <Clock className="h-3 w-3" /> Pending
        </Badge>
    );
}
