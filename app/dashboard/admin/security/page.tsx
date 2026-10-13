"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/lib/auth/RoleGuard";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Shield,
  User,
  Clock,
  RefreshCcw,
} from "lucide-react";

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  async function loadLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <RoleGuard adminOnly={true}>

      <div className="space-y-8 max-w-7xl">

        {/* Header */}
        <div className="flex justify-between items-center">

          <div>
            <h1 className="text-3xl font-bold">
              Security & Audit Logs
            </h1>

            <p className="text-muted-foreground mt-1">
              Monitor system activity
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

        </div>

        {/* Logs Table */}
        <Card className="p-4 overflow-x-auto">

          {loading && (
            <p className="text-sm text-muted-foreground p-4">
              Loading logs...
            </p>
          )}

          {!loading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">
              No activity found.
            </p>
          )}

          {!loading && logs.length > 0 && (

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b text-left text-muted-foreground">

                  <th className="py-3 px-2">
                    User
                  </th>

                  <th className="py-3 px-2">
                    Action
                  </th>

                  <th className="py-3 px-2">
                    Entity
                  </th>

                  <th className="py-3 px-2">
                    Time
                  </th>

                  <th className="py-3 px-2">
                    Meta
                  </th>

                </tr>
              </thead>

              <tbody>

                {logs.map((log) => (

                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* User */}
                    <td className="py-3 px-2">

                      <div className="flex items-center gap-2">

                        <User className="h-4 w-4 text-muted-foreground" />

                        <div className="text-xs">

                          <p>
                            {log.user_email || "—"}
                          </p>

                          <p className="text-muted-foreground">
                            {log.user_id}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Action */}
                    <td className="py-3 px-2 font-medium">
                      {log.action}
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-2">

                      {log.entity && (
                        <Badge variant="outline">
                          {log.entity}
                        </Badge>
                      )}

                    </td>

                    {/* Time */}
                    <td className="py-3 px-2 text-xs text-muted-foreground">

                      <div className="flex items-center gap-1">

                        <Clock className="h-3 w-3" />

                        {new Date(
                          log.created_at
                        ).toLocaleString()}

                      </div>

                    </td>

                    {/* Meta */}
                    <td className="py-3 px-2 text-xs text-muted-foreground">

                      <div>
                        IP: {log.ip_address || "—"}
                      </div>

                      <div>
                        UA: {log.user_agent || "—"}
                      </div>

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
