"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProceedingsUploader from "@/components/proceedings/ProceedingsUploader";
import {
  BookOpen,
  CheckCircle,
  FileText,
  ArrowLeft,
  ExternalLink,
  Download,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient();

interface ProceedingsRecord {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function OrganizerProceedingsPage() {
  const { conferenceId } = useParams<{ conferenceId: string }>();

  const [conference, setConference] = useState<any>(null);
  const [proceedings, setProceedings] = useState<ProceedingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlLoading, setUrlLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch conference details
    const { data: conf } = await supabase
      .from("conferences")
      .select("id, title, short_name, status, end_date")
      .eq("id", conferenceId)
      .single();

    setConference(conf);

    // Fetch proceedings via API (bypassed in API with admin)
    // For organizer, we use a direct admin-based fetch
    const res = await fetch(`/api/proceedings/${conferenceId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.proceedings) {
        setProceedings({
          ...json.proceedings,
          file_path: "",
          updated_at: json.proceedings.created_at,
        });
      }
    }

    setLoading(false);
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePreview() {
    setUrlLoading(true);
    try {
      const res = await fetch(`/api/proceedings/${conferenceId}`);
      const json = await res.json();
      if (json.signedUrl) window.open(json.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setUrlLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading proceedings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard/organizer/conferences"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Conferences
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Manage Proceedings
        </h1>
        {conference && (
          <p className="text-muted-foreground mt-1">
            {conference.title}
            {conference.short_name && (
              <Badge variant="secondary" className="ml-2 text-[11px]">
                {conference.short_name}
              </Badge>
            )}
          </p>
        )}
      </div>

      {/* Current proceedings info */}
      {proceedings && (
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-surface">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">
                    {proceedings.title}
                  </h3>
                  <Badge className="bg-success-surface text-success border-success/30 hover:bg-success-surface text-[11px]">
                    <CheckCircle className="h-3 w-3" />
                    Published
                  </Badge>
                </div>
                {proceedings.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {proceedings.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Uploaded {new Date(proceedings.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={urlLoading}
              className="gap-1 shrink-0"
            >
              {urlLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Preview
            </Button>
          </div>
        </Card>
      )}

      {/* Upload / Replace */}
      <ProceedingsUploader
        conferenceId={conferenceId}
        existingTitle={proceedings?.title}
        onUploaded={load}
      />
    </div>
  );
}
