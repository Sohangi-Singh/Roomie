"use client";

import { Users } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { HOSTELS, ROOM_TYPE_LABELS } from "@/config/hostels";
import { cn } from "@/lib/utils/cn";
import type { Group } from "@/types";

export function GroupCard({
  group,
  onJoin,
  joining,
  isMember,
}: {
  group: Group;
  onJoin?: () => void;
  joining?: boolean;
  isMember?: boolean;
}) {
  const filled = group.memberUids.length;
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{group.name}</p>
          <p className="truncate text-xs text-faint">
            {HOSTELS[group.hostel].alias} · {ROOM_TYPE_LABELS[group.roomType]}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-accent-800">
          {filled}/{group.size}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: group.size }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              i < filled ? "bg-accent-500" : "bg-accent-100",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Users className="size-3.5" />
          {group.openSlots > 0
            ? `${group.openSlots} open ${
                group.openSlots === 1 ? "spot" : "spots"
              }`
            : "Full"}
        </span>
        {isMember ? (
          <span className="text-xs font-medium text-success">You&apos;re in</span>
        ) : (
          onJoin &&
          group.openSlots > 0 && (
            <Button size="sm" onClick={onJoin} loading={joining}>
              Request to join
            </Button>
          )
        )}
      </div>
    </Card>
  );
}
