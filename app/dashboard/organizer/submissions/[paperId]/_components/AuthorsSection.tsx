"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

/* ─── Props ─── */
interface AuthorsSectionProps {
  authors: any[];
  paper: any;
  onCopyEmail: (email: string) => void;
  copiedEmail: string | null;
}

/* ─── Component ─── */
export default function AuthorsSection({ authors, paper, onCopyEmail, copiedEmail }: AuthorsSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full cursor-pointer flex items-center justify-between px-5 py-4 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
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
            <p className="text-sm text-muted-foreground">{paper.author_names || "No author data available"}</p>
          ) : (
            <div className="space-y-2">
              {authors.map((a) => (
                <div
                  key={a.id}
                  className={`border rounded-md p-3 ${a.is_primary ? "bg-primary/10 border-primary/30" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {a.author_order}. {a.name}
                      {a.is_primary && (
                        <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs">Primary</Badge>
                      )}
                    </p>
                    {a.email && (
                      <div className="flex items-center gap-1">
                        <a href={`mailto:${a.email}`} className="text-primary hover:underline text-xs">{a.email}</a>
                        <button onClick={() => onCopyEmail(a.email)} className="cursor-pointer text-muted-foreground hover:text-foreground" title="Copy email">
                          {copiedEmail === a.email ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                  {a.affiliation && <p className="text-xs text-muted-foreground mt-1">{a.affiliation}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Corresponding author */}
          {paper.email && (
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground">Corresponding Author:</span>{" "}
              <a href={`mailto:${paper.email}`} className="text-primary hover:underline">{paper.email}</a>
              {paper.contact_number && <span className="text-muted-foreground ml-3">| {paper.contact_number}</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
