"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/lib/auth/RoleGuard";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Calendar,
  User,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminConferencesPage() {
  const [loading, setLoading] = useState(true);
  const [conferences, setConferences] = useState<any[]>([]);

  const supabase = createClient();

  /* Load conferences */
  async function loadConferences() {
    setLoading(true);

    const { data, error } = await supabase
      .from("conferences")
      .select(`
        id,
        title,
        start_date,
        end_date,
        is_published,
        created_at,
        organizer_id,
        profiles (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setConferences(data || []);
    setLoading(false);
  }

  /* Toggle publish — via secure server API */
  async function togglePublish(id: string, value: boolean) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const res = await fetch("/api/organizer/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conferenceId: id, publish: value }),
      });

      if (!res.ok) {
        const result = await res.json();
        console.error("Publish error:", result.error);
      }
    } catch (err) {
      console.error("Publish network error:", err);
    }

    loadConferences();
  }

  useEffect(() => {
    loadConferences();
  }, []);

  return (
    <RoleGuard adminOnly={true}>

      <div className="space-y-8 max-w-7xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            Conference Moderation
          </h1>

          <p className="text-muted-foreground mt-1">
            Manage and review all conferences
          </p>
        </div>

        {/* Main */}
        <Card className="p-4 overflow-x-auto">

          {loading && (
            <p className="text-sm text-muted-foreground p-4">
              Loading conferences...
            </p>
          )}

          {!loading && conferences.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">
              No conferences found.
            </p>
          )}

          {!loading && conferences.length > 0 && (

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b text-left text-muted-foreground">

                  <th className="py-3 px-2">
                    Title
                  </th>

                  <th className="py-3 px-2">
                    Organizer
                  </th>

                  <th className="py-3 px-2">
                    Dates
                  </th>

                  <th className="py-3 px-2">
                    Status
                  </th>

                  <th className="py-3 px-2 text-right">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {conferences.map((c) => (

                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* Title */}
                    <td className="py-3 px-2 font-medium">
                      {c.title}
                    </td>

                    {/* Organizer */}
                    <td className="py-3 px-2">

                      <div className="flex items-center gap-2">

                        <User className="h-4 w-4 text-muted-foreground" />

                        <div className="text-xs">

                          <p>
                            {c.profiles?.full_name || "—"}
                          </p>

                          <p className="text-muted-foreground">
                            {c.profiles?.email}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Dates */}
                    <td className="py-3 px-2 text-xs text-muted-foreground">

                      <div className="flex items-center gap-1">

                        <Calendar className="h-3 w-3" />

                        {c.start_date} → {c.end_date}

                      </div>

                    </td>

                    {/* Status */}
                    <td className="py-3 px-2">

                      {c.is_published ? (

                        <Badge className="bg-success-surface text-success border border-success/30">
                          Published
                        </Badge>

                      ) : (

                        <Badge className="bg-warning-surface text-warning border border-warning/30">
                          Draft
                        </Badge>

                      )}

                    </td>

                    {/* Action */}
                    <td className="py-3 px-2 text-right">

                      {c.is_published ? (

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            togglePublish(c.id, false)
                          }
                        >

                          <EyeOff className="h-4 w-4 mr-1" />
                          Unpublish

                        </Button>

                      ) : (

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            togglePublish(c.id, true)
                          }
                        >

                          <Eye className="h-4 w-4 mr-1" />
                          Publish

                        </Button>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </Card>

      </div>

    </RoleGuard>
  );
}
