"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/lib/auth/RoleGuard";
import { createClient } from "@/lib/supabase/client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  CreditCard,
  Calendar,
  User,
  RefreshCcw,
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  const supabase = createClient();

  /* Load payments */
  async function loadPayments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("conference_registrations")
      .select(`
        id,
        payment_id,
        payment_status,
        amount,
        created_at,
        profiles (
          full_name,
          email
        ),
        conferences (
          title
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setPayments(data || []);
    setLoading(false);
  }

  /* Manual refresh */
  async function refresh() {
    loadPayments();
  }

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <RoleGuard adminOnly={true}>

      <div className="space-y-8 max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-3xl font-bold">
              Payments Monitoring
            </h1>

            <p className="text-muted-foreground mt-1">
              Track all platform transactions
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

        </div>

        {/* Table */}
        <Card className="p-4 overflow-x-auto">

          {loading && (
            <p className="text-sm text-muted-foreground p-4">
              Loading payments...
            </p>
          )}

          {!loading && payments.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">
              No payments found.
            </p>
          )}

          {!loading && payments.length > 0 && (

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b text-left text-muted-foreground">

                  <th className="py-3 px-2">
                    User
                  </th>

                  <th className="py-3 px-2">
                    Conference
                  </th>

                  <th className="py-3 px-2">
                    Amount
                  </th>

                  <th className="py-3 px-2">
                    Status
                  </th>

                  <th className="py-3 px-2">
                    Transaction ID
                  </th>

                  <th className="py-3 px-2">
                    Date
                  </th>

                </tr>
              </thead>

              <tbody>

                {payments.map((p) => (

                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* User */}
                    <td className="py-3 px-2">

                      <div className="flex items-center gap-2">

                        <User className="h-4 w-4 text-muted-foreground" />

                        <div className="text-xs">

                          <p>
                            {p.profiles?.full_name || "—"}
                          </p>

                          <p className="text-muted-foreground">
                            {p.profiles?.email}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Conference */}
                    <td className="py-3 px-2">
                      {p.conferences?.title}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-2 font-medium">
                      ₹{p.amount}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2">
                      <StatusBadge status={p.payment_status} />
                    </td>

                    {/* Payment ID */}
                    <td className="py-3 px-2 text-xs font-mono">
                      {p.payment_id || "—"}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-2 text-xs text-muted-foreground">

                      <div className="flex items-center gap-1">

                        <Calendar className="h-3 w-3" />

                        {new Date(
                          p.created_at
                        ).toLocaleString()}

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

/* Status Badge */
function StatusBadge({ status }: { status: string }) {

  if (status === "success") {
    return (
      <Badge className="bg-success-surface text-success border border-success/30">
        Paid
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge className="bg-destructive-surface text-destructive border border-destructive/30">
        Failed
      </Badge>
    );
  }

  return (
    <Badge className="bg-warning-surface text-warning border border-warning/30">
      Pending
    </Badge>
  );
}
