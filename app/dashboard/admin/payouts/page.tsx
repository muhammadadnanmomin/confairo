"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/lib/auth/RoleGuard";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

import {
    ArrowDownToLine,
    RefreshCcw,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    User,
    IndianRupee,
    Calendar,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────

interface PayoutRow {
    id: string;
    amount: number;
    status: string;
    notes: string | null;
    admin_notes: string | null;
    created_at: string;
    processed_at: string | null;
    organizer_id: string;
    profiles: { name: string | null; email: string | null } | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatINR(n: number) {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ── Page ────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
    const supabase = createClient();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState<PayoutRow[]>([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [processingId, setProcessingId] = useState<string | null>(null);

    async function loadPayouts() {
        setLoading(true);

        let query = supabase
            .from("organizer_payouts")
            .select(`
        id, amount, status, notes, admin_notes,
        created_at, processed_at, organizer_id,
        profiles ( name, email )
      `)
            .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
            query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Load payouts error:", error);
        }

        setPayouts((data as any) || []);
        setLoading(false);
    }

    useEffect(() => {
        loadPayouts();
    }, [statusFilter]);

    async function processAction(payoutId: string, newStatus: string) {
        setProcessingId(payoutId);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/payouts/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    payoutId,
                    status: newStatus,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                toast({ variant: "destructive", title: "Error", description: json.error });
            } else {
                toast({ title: `Payout marked as ${newStatus}` });
                await loadPayouts();
            }
        } catch {
            toast({ variant: "destructive", title: "Something went wrong" });
        }

        setProcessingId(null);
    }

    // Stats
    const totalPending = payouts
        .filter((p) => p.status === "pending" || p.status === "processing")
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalCompleted = payouts
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0);

    return (
        <RoleGuard adminOnly={true}>
            <div className="space-y-6 max-w-6xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Payout Management</h1>
                        <p className="text-muted-foreground mt-1">Review and process organizer payout requests</p>
                    </div>
                    <Button variant="outline" onClick={loadPayouts} className="gap-2 shrink-0">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pending / Processing</p>
                            <p className="text-2xl font-bold mt-1">₹{formatINR(totalPending)}</p>
                        </div>
                        <div className="bg-warning-surface p-3 rounded-lg">
                            <Clock className="h-5 w-5 text-warning" />
                        </div>
                    </Card>
                    <Card className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Settled</p>
                            <p className="text-2xl font-bold mt-1">₹{formatINR(totalCompleted)}</p>
                        </div>
                        <div className="bg-success-surface p-3 rounded-lg">
                            <IndianRupee className="h-5 w-5 text-success" />
                        </div>
                    </Card>
                    <Card className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Requests</p>
                            <p className="text-2xl font-bold mt-1">{payouts.length}</p>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg">
                            <ArrowDownToLine className="h-5 w-5 text-primary" />
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {["all", "pending", "processing", "completed", "failed"].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className="capitalize"
                        >
                            {s === "all" ? "All" : s}
                        </Button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading payouts…</p>
                )}

                {/* Empty */}
                {!loading && payouts.length === 0 && (
                    <Card className="p-10 text-center">
                        <p className="text-muted-foreground">No payout requests found.</p>
                    </Card>
                )}

                {/* Table */}
                {!loading && payouts.length > 0 && (
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <th className="py-3 px-4">Organizer</th>
                                        <th className="py-3 px-4">Amount</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Requested</th>
                                        <th className="py-3 px-4">Notes</th>
                                        <th className="py-3 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.map((p, i) => (
                                        <tr
                                            key={p.id}
                                            className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 1 ? "bg-muted/25" : ""
                                                }`}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {p.profiles?.name || "—"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {p.profiles?.email || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 font-semibold text-foreground">
                                                ₹{formatINR(Number(p.amount))}
                                            </td>

                                            <td className="py-3 px-4">
                                                <PayoutStatusBadge status={p.status} />
                                            </td>

                                            <td className="py-3 px-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(p.created_at)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-xs text-muted-foreground max-w-[150px] truncate">
                                                {p.notes || "—"}
                                            </td>

                                            <td className="py-3 px-4">
                                                {p.status === "pending" && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs"
                                                            disabled={processingId === p.id}
                                                            onClick={() => processAction(p.id, "processing")}
                                                        >
                                                            Processing
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="text-xs bg-success hover:bg-success/90 text-success-foreground"
                                                            disabled={processingId === p.id}
                                                            onClick={() => processAction(p.id, "completed")}
                                                        >
                                                            Complete
                                                        </Button>
                                                    </div>
                                                )}
                                                {p.status === "processing" && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            className="text-xs bg-success hover:bg-success/90 text-success-foreground"
                                                            disabled={processingId === p.id}
                                                            onClick={() => processAction(p.id, "completed")}
                                                        >
                                                            Complete
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs text-destructive hover:text-destructive/90"
                                                            disabled={processingId === p.id}
                                                            onClick={() => processAction(p.id, "failed")}
                                                        >
                                                            Failed
                                                        </Button>
                                                    </div>
                                                )}
                                                {(p.status === "completed" || p.status === "failed") && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {p.processed_at ? formatDate(p.processed_at) : "—"}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </RoleGuard>
    );
}

// ── Sub-components ──────────────────────────────────────────────────

function PayoutStatusBadge({ status }: { status: string }) {
    if (status === "completed")
        return (
            <Badge className="bg-success-surface text-success border border-success/30 hover:bg-success-surface text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
        );
    if (status === "processing")
        return (
            <Badge className="bg-info-surface text-info border border-info/30 hover:bg-info-surface text-xs gap-1">
                <Loader2 className="h-3 w-3" /> Processing
            </Badge>
        );
    if (status === "failed")
        return (
            <Badge className="bg-destructive-surface text-destructive border border-destructive/30 hover:bg-destructive-surface text-xs gap-1">
                <XCircle className="h-3 w-3" /> Failed
            </Badge>
        );
    return (
        <Badge className="bg-warning-surface text-warning border border-warning/30 hover:bg-warning-surface text-xs gap-1">
            <Clock className="h-3 w-3" /> Pending
        </Badge>
    );
}
