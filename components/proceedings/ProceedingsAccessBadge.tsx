"use client";

import { Badge } from "@/components/ui/badge";
import { UserCheck, Users, Shield } from "lucide-react";

interface Props {
  reason: "author" | "attendee" | "organizer";
}

const config = {
  author: {
    label: "Access: Author",
    icon: UserCheck,
    className:
      "bg-success-surface text-success border-success/30 hover:bg-success-surface",
  },
  attendee: {
    label: "Access: Attendee",
    icon: Users,
    className:
      "bg-info-surface text-info border-info/30 hover:bg-info-surface",
  },
  organizer: {
    label: "Access: Organizer",
    icon: Shield,
    className:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
  },
};

export default function ProceedingsAccessBadge({ reason }: Props) {
  const { label, icon: Icon, className } = config[reason];

  return (
    <Badge variant="outline" className={`gap-1.5 px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
