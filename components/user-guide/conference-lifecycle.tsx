"use client";

import {
  PlusCircle,
  Globe,
  FileUp,
  Search,
  CheckCircle2,
  CalendarDays,
  Award,
} from "lucide-react";

const lifecycleSteps = [
  { icon: PlusCircle, label: "Create", sublabel: "Set up conference" },
  { icon: Globe, label: "Publish", sublabel: "Go live" },
  { icon: FileUp, label: "Submit", sublabel: "Collect papers" },
  { icon: Search, label: "Review", sublabel: "Peer evaluation" },
  { icon: CheckCircle2, label: "Accept", sublabel: "Make decisions" },
  { icon: CalendarDays, label: "Schedule", sublabel: "Build agenda" },
  { icon: Award, label: "Certify", sublabel: "Generate certs" },
];

export function ConferenceLifecycle() {
  return (
    <div className="relative w-full overflow-x-auto pb-4">
      <div className="mx-auto flex min-w-[680px] items-center justify-center gap-0 px-4">
        {lifecycleSteps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === lifecycleSteps.length - 1;

          return (
            <div key={idx} className="flex items-center">
              {/* Node */}
              <div className="group flex flex-col items-center">
                {/* Circle */}
                <div
                  className="
                    flex h-14 w-14 items-center justify-center rounded-2xl
                    border-2 border-primary/20 bg-card shadow-sm
                    transition-all duration-300
                    group-hover:border-primary group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20
                    group-hover:scale-110
                    sm:h-16 sm:w-16
                  "
                >
                  <Icon
                    className="
                      h-6 w-6 text-primary transition-colors duration-300
                      group-hover:text-white
                      sm:h-7 sm:w-7
                    "
                  />
                </div>

                {/* Label */}
                <p className="mt-2.5 text-sm font-semibold text-foreground">
                  {step.label}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {step.sublabel}
                </p>

                {/* Step number pill */}
                <span
                  className="
                    mt-1.5 inline-flex h-5 w-5 items-center justify-center
                    rounded-full bg-muted text-[0.625rem] font-bold text-muted-foreground
                    transition-colors group-hover:bg-primary/10 group-hover:text-primary
                  "
                >
                  {idx + 1}
                </span>
              </div>

              {/* Connector arrow */}
              {!isLast && (
                <div className="mx-1 flex items-center sm:mx-2">
                  <div className="h-px w-6 bg-gradient-to-r from-primary/30 to-primary/20 sm:w-10" />
                  <div className="h-0 w-0 border-t-[5px] border-b-[5px] border-l-[6px] border-t-transparent border-b-transparent border-l-primary/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll hint on mobile */}
      <div className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
        ← Scroll to view full lifecycle →
      </div>
    </div>
  );
}
