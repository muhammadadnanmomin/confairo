"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

interface ReviewerAuthorsSectionProps {
  authors: any[];
  paper: any;
}

export default function ReviewerAuthorsSection({ authors, paper }: ReviewerAuthorsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Authors */}
      <Card className="overflow-hidden">
        <button
          className="w-full cursor-pointer flex items-center justify-between px-5 py-4 bg-muted/50 hover:bg-muted/50 transition-colors text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4" />
            👤 Authors
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="px-5 py-4 border-t">
            {authors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No author data available</p>
            ) : (
              <div className="space-y-2">
                {authors.map((a, i) => (
                  <div
                    key={i}
                    className={`border rounded-md p-3 ${a.is_primary ? "bg-info-surface border-info/20" : ""}`}
                  >
                    <p className="font-medium text-sm">
                      {a.author_order}. {a.name}
                      {a.is_primary && (
                        <Badge className="ml-2 bg-info-surface text-info text-xs">Primary</Badge>
                      )}
                    </p>
                    {a.affiliation && <p className="text-xs text-muted-foreground mt-1">{a.affiliation}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Declarations */}
      <Card className="p-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Author Declarations
        </h3>
        <div className="space-y-1">
          <Declaration ok={paper.declaration_original} text="Original work" />
          <Declaration ok={paper.declaration_no_plagiarism} text="No plagiarism" />
          <Declaration ok={paper.declaration_author_approval} text="Author approvals" />
        </div>
      </Card>
    </div>
  );
}

function Declaration({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`text-sm ${ok ? "text-success" : "text-destructive"}`}>
      {ok ? "✔" : "✖"} {text}
    </p>
  );
}
