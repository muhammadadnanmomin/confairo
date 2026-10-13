"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const { toast } = useToast();

    /* Handle recovery token */
    useEffect(() => {
        async function handleRecovery() {
            const hash = window.location.hash;

            if (!hash) return;

            const params = new URLSearchParams(hash.substring(1));

            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (!accessToken || !refreshToken) {
                setError("Invalid reset link");
                return;
            }

            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
        }

        handleRecovery();
    }, []);

    /* Update password */
    async function handleReset(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);

            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });

        } else {
            toast({
                title: "Success",
                description: "Password updated successfully!",
            });

            setTimeout(() => {
                router.push("/login");
            }, 1500);
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4"
            suppressHydrationWarning
        >

            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">

                {/* Brand header */}
                <div className="mb-4 flex justify-center">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/logos/Horizontal_Logo.png"
                            alt="Confairo"
                            width={165}
                            height={55}
                            priority
                            className="w-[150px] sm:w-[165px] h-auto object-contain"
                        />
                    </Link>
                </div>

                {/* Title */}
                <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
                    Reset Password
                </h1>

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-surface p-2 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleReset} className="space-y-4">

                    <div>
                        <label className="text-sm font-medium text-foreground">
                            New Password
                        </label>

                        <Input
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            required
                            suppressHydrationWarning
                            onChange={(e) => setPassword(e.target.value)}
                        />

                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </Button>

                </form>

            </div>

        </div>
    );
}
