"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";
import { useOrganization } from "@/lib/organizations/useOrganization";
import {
    PRO_SLOT_PRICE,
    PLAN_LABELS,
    normalizePlanType,
    type PlanType,
    AI_CREDIT_PACKS,
    getAICreditPack,
} from "@/lib/config/pricing";
import { generateReceipt, type ReceiptData } from "@/lib/billing/generateReceipt";
import PaymentSuccessModal from "@/components/payments/PaymentSuccessModal";
import AICreditModal from "@/components/billing/AICreditModal";
import { toast } from "@/components/ui/use-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Check,
    Sparkles,
    Loader2,
    Crown,
    ArrowLeft,
    ShieldCheck,
    Download,
    Receipt,
    CreditCard,
    Clock,
    Zap,
    Package,
} from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const supabase = createClient();

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SlotPurchase {
    id: string;
    payment_id: string;
    order_id: string;
    amount: number;
    description: string;
    created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Normalize legacy descriptions that used "AI Credits" → "AI Analyses" */
function normalizeDescription(desc: string) {
    return desc?.replace(/AI Credits/gi, "AI Analyses") ?? desc;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function OrganizerBillingPage() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useProfile();
    const { organization, loading: orgLoading } = useOrganization();

    const [paying, setPaying] = useState(false);
    const [alreadyPaid, setAlreadyPaid] = useState(false);
    const [successData, setSuccessData] = useState<ReceiptData | null>(null);

    /* Billing history */
    const [purchases, setPurchases] = useState<SlotPurchase[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    /* AI state (for credit purchase card) */
    const [aiConferences, setAiConferences] = useState<{ id: string; title: string }[]>([]);
    const [selectedConference, setSelectedConference] = useState<string | null>(null);
    const [buyingCredits, setBuyingCredits] = useState(false);
    const [openBundleModal, setOpenBundleModal] = useState(false);

    useEffect(() => {
        if (normalizePlanType(organization?.plan_type) === "institutional") {
            setAlreadyPaid(true);
        }
    }, [organization]);

    /* Redirect if no organization */
    useEffect(() => {
        if (!profileLoading && !orgLoading && !organization) {
            router.replace("/dashboard/onboarding/organization");
        }
    }, [profileLoading, orgLoading, organization, router]);

    /* Load billing history */
    useEffect(() => {
        async function loadHistory() {
            if (!organization?.id) return;
            setHistoryLoading(true);

            const { data } = await supabase
                .from("organizer_slot_purchases")
                .select("*")
                .eq("organization_id", organization.id)
                .order("created_at", { ascending: false });

            setPurchases(data || []);
            setHistoryLoading(false);
        }

        loadHistory();
    }, [organization?.id]);

    /* Load conferences for AI credit purchase card */
    useEffect(() => {
        async function loadConferences() {
            if (!organization?.id) return;

            const { data: confs } = await supabase
                .from("conferences")
                .select("id, title")
                .eq("organization_id", organization.id)
                .order("created_at", { ascending: false });

            const conferences = confs || [];
            setAiConferences(conferences);

            if (conferences.length > 0) {
                setSelectedConference(conferences[0].id);
            }
        }

        loadConferences();
    }, [organization?.id]);



    const SLOT_BENEFITS = [
        "Unlimited paper submissions per conference",
        "Unlocks one additional conference slot",
        "100 AI-powered analyses included",
        "Full conference management workflow",
        "Advanced reviewer management",
        "Submission reports and analytics",
        "Bulk email communication",
        "Priority support",
    ];

    /* ---------------------------------------------------------------- */
    /*  Razorpay Checkout                                                */
    /* ---------------------------------------------------------------- */
    async function handlePayment(selectedCredits: number = 0) {
        if (!profile || !organization) return;

        setOpenBundleModal(false);
        setPaying(true);

        // Calculate add-on price
        const addOnPrice = selectedCredits === 50 ? 299 : selectedCredits === 100 ? 499 : 0;
        const totalAmount = PRO_SLOT_PRICE + addOnPrice;

        try {
            /* 1. Create order */
            const res = await fetch("/api/billing/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: organization.id,
                    userId: profile.id,
                    credits: selectedCredits,
                }),
            });

            if (!res.ok) throw new Error("Failed to create order");

            const order = await res.json();

            /* 2. Load Razorpay script */
            if (!window.Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error("Razorpay script failed"));
                    document.body.appendChild(script);
                });
            }

            /* 3. Open checkout */
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Confairo",
                description: selectedCredits > 0
                    ? `Pro Plan + ${selectedCredits} AI Analyses`
                    : "Pro Plan + 100 AI Analyses",
                order_id: order.id,
                prefill: {
                    email: profile.email || "",
                    name: profile.name || "",
                },
                handler: async (response: any) => {
                    /* 4. Verify */
                    const verifyRes = await fetch("/api/billing/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: order.id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            organizationId: organization.id,
                            credits: selectedCredits,
                            addOnPrice,
                        }),
                    });

                    if (verifyRes.ok) {
                        /* 5. Build receipt data */
                        const receipt: ReceiptData = {
                            paymentId: response.razorpay_payment_id,
                            orderId: order.id,
                            amount: totalAmount,
                            description: selectedCredits > 0
                                ? `Pro Plan + ${selectedCredits} AI Analyses`
                                : "Pro Plan + 100 AI Analyses",
                            payerName: profile.name || "Organizer",
                            payerEmail: profile.email || undefined,
                            paidAt: new Date().toISOString(),
                        };

                        /* 6. Auto-download receipt */
                        generateReceipt(receipt);

                        /* 7. Show success modal */
                        setSuccessData(receipt);

                        /* 8. Reload billing history */
                        const { data } = await supabase
                            .from("organizer_slot_purchases")
                            .select("*")
                            .eq("organization_id", organization.id)
                            .order("created_at", { ascending: false });
                        setPurchases(data || []);
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Payment verification failed",
                            description:
                                "Your payment could not be verified. Please contact support at contact@confairo.com",
                        });
                    }
                },
                theme: { color: "#4f46e5" },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Payment error:", err);
        } finally {
            setPaying(false);
        }
    }

    /* ---------------------------------------------------------------- */
    /*  AI Credit Purchase (Razorpay)                                    */
    /* ---------------------------------------------------------------- */
    async function handleBuyCredits(packId: string) {
        if (!profile || !selectedConference) {
            toast({
                variant: "destructive",
                title: "Cannot purchase credits",
                description: "Please select a conference first.",
            });
            return;
        }

        const pack = getAICreditPack(packId);
        if (!pack) return;

        setBuyingCredits(true);

        try {
            /* 1. Create order */
            const res = await fetch("/api/ai-credits/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conferenceId: selectedConference,
                    packId,
                    userId: profile.id,
                }),
            });

            if (!res.ok) throw new Error("Failed to create order");
            const order = await res.json();

            /* 2. Load Razorpay script */
            if (!window.Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error("Razorpay script failed"));
                    document.body.appendChild(script);
                });
            }

            /* 3. Open checkout */
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Confairo",
                description: `AI Analyses — ${pack.label}`,
                order_id: order.id,
                prefill: {
                    email: profile.email || "",
                    name: profile.name || "",
                },
                handler: async (response: any) => {
                    /* 4. Verify */
                    const verifyRes = await fetch("/api/ai-credits/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: order.id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            conferenceId: selectedConference,
                            packId,
                        }),
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok && verifyData.success) {
                        toast({
                            title: "🎉 Credits Added!",
                            description: `${pack.credits} AI analyses have been added.`,
                        });
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Verification failed",
                            description:
                                "Credits will be added automatically. Contact support if not reflected within 5 minutes.",
                        });
                    }
                },
                modal: {
                    ondismiss: () => setBuyingCredits(false),
                },
                theme: { color: "#7c3aed" },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("AI credit purchase error:", err);
            toast({
                variant: "destructive",
                title: "Payment failed",
                description: "Could not initiate payment. Please try again.",
            });
        } finally {
            setBuyingCredits(false);
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Loading                                                          */
    /* ---------------------------------------------------------------- */
    if (profileLoading || orgLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    /* ---------------------------------------------------------------- */
    /*  Already on Institutional                                        */
    /* ---------------------------------------------------------------- */
    if (alreadyPaid) {
        const planLabel = PLAN_LABELS[normalizePlanType(organization.plan_type)];
        return (
            <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-surface">
                    <ShieldCheck className="h-7 w-7 text-success" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                    You&apos;re on the {planLabel} Plan
                </h1>
                <p className="text-muted-foreground">
                    Your organization already has access to all {planLabel} features.
                    No further upgrade is needed.
                </p>
                <Button onClick={() => router.push("/dashboard/organizer")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    /* ---------------------------------------------------------------- */
    /*  Billing Page                                                     */
    /* ---------------------------------------------------------------- */
    return (
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">

            {/* Back link */}
            <button
                onClick={() => router.back()}
                className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>

            <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Crown className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Billing
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Manage your conference billing and AI usage.
                </p>
            </div>



            {/* ============================================================ */}
            {/*  AI Credit Purchase Card                                      */}
            {/* ============================================================ */}
            {selectedConference && (
                <Card className="p-6 border-success/30 bg-gradient-to-b from-success-surface/50 to-card shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-9 w-9 rounded-xl bg-success-surface flex items-center justify-center">
                            <Package className="h-5 w-5 text-success" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">⚡ Buy AI Analyses</h3>
                            <p className="text-xs text-muted-foreground">
                                Top up your AI analyses instantly
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {AI_CREDIT_PACKS.map((pack) => (
                            <button
                                key={pack.id}
                                onClick={() => handleBuyCredits(pack.id)}
                                disabled={buyingCredits}
                                className={`relative group cursor-pointer rounded-xl border-2 p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed ${pack.id === "ai_100"
                                    ? "border-primary/40 bg-primary/5 hover:border-primary/60"
                                    : "border-border bg-card hover:border-border-strong"
                                    }`}
                            >
                                {pack.id === "ai_100" && (
                                    <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        Best Value
                                    </span>
                                )}
                                <p className="text-2xl font-bold text-foreground">+{pack.credits}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">AI Analyses</p>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-foreground">
                                        ₹{pack.price.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        (₹{(pack.price / pack.credits).toFixed(1)}/analysis)
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        Each AI action (paper review or similarity check) uses 1 analysis
                    </p>
                </Card>
            )}



            {/* ============================================================ */}
            {/*  Slot Purchase Card                                          */}
            {/* ============================================================ */}
            <Card className="p-8 border-primary/20 bg-gradient-to-b from-primary/5 to-card">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary-hover text-sm px-3 py-1">
                            Pro
                        </Badge>
                        <span className="text-sm text-muted-foreground">One-time per conference slot</span>
                    </div>
                    <div className="text-right">
                        <span className="text-4xl font-bold text-foreground">
                            ₹{PRO_SLOT_PRICE.toLocaleString("en-IN")}
                        </span>
                        <span className="text-muted-foreground ml-1">/ slot</span>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <p className="text-sm font-medium text-foreground mb-4">
                        Everything in Free, plus:
                    </p>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {SLOT_BENEFITS.map((benefit) => (
                            <li key={benefit} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>

                <Button
                    onClick={() => setOpenBundleModal(true)}
                    disabled={paying}
                    className="mt-8 w-full h-12 text-base bg-primary hover:bg-primary-hover gap-2"
                >
                    {paying ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing…
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5" />
                            Pay ₹{PRO_SLOT_PRICE.toLocaleString("en-IN")} & Buy Slot
                        </>
                    )}
                </Button>

            </Card>

            {/* Trust signals */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secured by Razorpay
                </span>
                <span>•</span>
                <span>Instant activation after payment</span>
                <span>•</span>
                <span>No recurring charges</span>
            </div>

            {/* ============================================================ */}
            {/*  Billing History                                             */}
            {/* ============================================================ */}
            <Card className="overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b bg-muted/30">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                            <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <span className="font-semibold text-foreground block">Billing History</span>
                            <span className="text-xs text-muted-foreground">
                                {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {historyLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty */}
                {!historyLoading && purchases.length === 0 && (
                    <div className="py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                            <CreditCard className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">No purchases yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your slot purchases will appear here after payment.
                        </p>
                    </div>
                )}

                {/* Desktop Table */}
                {!historyLoading && purchases.length > 0 && (
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <th className="py-3 px-4">Payment ID</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 1 ? "bg-muted/20" : ""}`}
                                    >
                                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                                            {p.payment_id}
                                        </td>
                                        <td className="py-3 px-4 text-foreground">
                                            {normalizeDescription(p.description)}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-foreground">
                                            ₹{p.amount.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {formatDate(p.created_at)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1 text-primary hover:text-primary-hover hover:bg-primary/10 text-xs"
                                                onClick={() =>
                                                    generateReceipt({
                                                        paymentId: p.payment_id,
                                                        orderId: p.order_id,
                                                        amount: p.amount,
                                                        description: normalizeDescription(p.description),
                                                        payerName: profile?.name || "Organizer",
                                                        payerEmail: profile?.email || undefined,
                                                        paidAt: p.created_at,
                                                    })
                                                }
                                            >
                                                <Download className="h-3 w-3" />
                                                PDF
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile Cards */}
                {!historyLoading && purchases.length > 0 && (
                    <div className="md:hidden divide-y">
                        {purchases.map((p) => (
                            <div key={p.id} className="p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {normalizeDescription(p.description)}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                            {p.payment_id}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-foreground shrink-0">
                                        ₹{p.amount.toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {formatDate(p.created_at)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 gap-1 text-primary text-[11px] px-2"
                                        onClick={() =>
                                            generateReceipt({
                                                paymentId: p.payment_id,
                                                orderId: p.order_id,
                                                amount: p.amount,
                                                description: normalizeDescription(p.description),
                                                payerName: profile?.name || "Organizer",
                                                payerEmail: profile?.email || undefined,
                                                paidAt: p.created_at,
                                            })
                                        }
                                    >
                                        <Download className="h-3 w-3" />
                                        Receipt
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Payment Success Modal */}
            {successData && (
                <PaymentSuccessModal
                    open={true}
                    onClose={() => {
                        setSuccessData(null);
                    }}
                    receipt={successData}
                    continueLabel="Continue to Dashboard"
                    onContinue={() => {
                        setSuccessData(null);
                        router.push("/dashboard/organizer");
                    }}
                />
            )}

            {/* AI Credit Bundle Modal */}
            <AICreditModal
                open={openBundleModal}
                onClose={() => setOpenBundleModal(false)}
                onConfirm={(credits) => handlePayment(credits)}
                paying={paying}
            />
        </div>
    );
}
