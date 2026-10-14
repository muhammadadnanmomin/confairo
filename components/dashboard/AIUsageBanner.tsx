"use client";

import { useEffect, useState } from "react";
import { Brain, Zap } from "lucide-react";

interface AIUsageBannerProps {
  conferenceId: string;
}

/**
 * Displays AI analysis usage with an animated progress bar.
 * Fetches usage from the API or accepts usage from AI card responses.
 */
export default function AIUsageBanner({ conferenceId }: AIUsageBannerProps) {
  const [used, setUsed] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conferenceId) return;

    async function fetchUsage() {
      try {
        const res = await fetch("/api/ai-credits/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conferenceId }),
        });
        const data = await res.json();
        if (data.usage) {
          setUsed(data.usage.used);
          setTotal(data.usage.total);
        }
      } catch {
        // Silently fail — banner just won't show
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();

    // Listen for usage updates from AI card responses
    function handleUsageUpdate(e: CustomEvent<{ used: number; total: number }>) {
      setUsed(e.detail.used);
      setTotal(e.detail.total);
    }

    window.addEventListener("ai-usage-update", handleUsageUpdate as EventListener);
    return () => window.removeEventListener("ai-usage-update", handleUsageUpdate as EventListener);
  }, [conferenceId]);

  if (loading || used === null || total === null) return null;

  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const remaining = total - used;

  // Color thresholds: green <70%, yellow 70-90%, red >90%
  const barColor =
    percentage > 90
      ? "bg-gradient-to-r from-destructive/80 to-destructive"
      : percentage > 70
        ? "bg-gradient-to-r from-warning/80 to-warning"
        : "bg-gradient-to-r from-success/80 to-success";

  const textColor =
    percentage > 90
      ? "text-destructive"
      : percentage > 70
        ? "text-warning"
        : "text-success";

  const bgColor =
    percentage > 90
      ? "bg-destructive-surface border-destructive/20"
      : percentage > 70
        ? "bg-warning-surface border-warning/20"
        : "bg-success-surface border-success/20";

  const glowColor =
    percentage > 90
      ? "shadow-destructive/20"
      : percentage > 70
        ? "shadow-warning/20"
        : "shadow-success/20";

  return (
    <div
      className={`rounded-xl border p-4 ${bgColor} shadow-sm ${glowColor} transition-all duration-500`}
      id="ai-usage-banner"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${percentage > 90 ? "bg-destructive/10" : percentage > 70 ? "bg-warning/10" : "bg-success/10"}`}>
            <Brain className={`h-4 w-4 ${textColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              🧠 AI Usage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${textColor}`}>
            {used} / {total}
          </span>
          {remaining <= 2 && remaining > 0 && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full animate-pulse">
              {remaining} left
            </span>
          )}
          {remaining === 0 && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/15 px-1.5 py-0.5 rounded-full">
              Exhausted
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/50 shadow-inner">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-1.5 mt-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {remaining > 0
              ? `${remaining} ${remaining !== 1 ? "analyses" : "analysis"} remaining`
              : "Purchase additional analyses to continue"}
          </p>
          <p className="text-[11px] text-muted-foreground">{percentage}% used</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Each AI action uses 1 analysis</p>
        {percentage >= 80 && remaining > 0 && (
          <p className="text-[10px] text-warning flex items-center gap-1">
            ⚠️ You&apos;re running low on AI analyses
          </p>
        )}
      </div>
    </div>
  );
}
