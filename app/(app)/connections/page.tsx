"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Check, Clock, ChevronRight } from "lucide-react";
import { useConnections } from "@/hooks/useConnections";
import { markInboxSeen } from "@/hooks/useInboxBadge";
import { getLastMessagesByPeer, getUser } from "@/lib/firebase/db";
import { Avatar, Card, Button, Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/features/EmptyState";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { cn } from "@/lib/utils/cn";
import { batchLabel } from "@/config/college";
import type { Connection, Message, User } from "@/types";

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ConnectionsPage() {
  const { connections, loading, accept, decline, myUid } = useConnections();
  const [users, setUsers] = useState<Record<string, User>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    markInboxSeen();
  }, []);

  useEffect(() => {
    if (!myUid) return;
    const others = [
      ...new Set(connections.map((c) => (c.from === myUid ? c.to : c.from))),
    ];
    let active = true;
    void Promise.all(others.map(getUser)).then((list) => {
      if (!active) return;
      const map: Record<string, User> = {};
      list.forEach((u) => {
        if (u) map[u.uid] = u;
      });
      setUsers(map);
    });
    return () => {
      active = false;
    };
  }, [connections, myUid]);

  useEffect(() => {
    if (!myUid) return;
    let active = true;
    void getLastMessagesByPeer(myUid).then((map) => {
      if (active) setLastMessages(map);
    });
    return () => {
      active = false;
    };
  }, [myUid, connections]);

  const otherUid = (c: Connection) => (c.from === myUid ? c.to : c.from);
  const run = (id: string, fn: () => Promise<void>) => async () => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const incoming = connections.filter(
    (c) => c.status === "pending" && c.to === myUid,
  );
  const sent = connections.filter(
    (c) => c.status === "pending" && c.from === myUid,
  );
  const connected = connections
    .filter((c) => c.status === "accepted")
    .sort((a, b) => {
      const ma = lastMessages[otherUid(a)]?.createdAt ?? 0;
      const mb = lastMessages[otherUid(b)]?.createdAt ?? 0;
      return mb - ma;
    });

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">DMs</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            DM your requests and discuss the grey areas with them if need be.
          </p>
        </div>
        <ThemeToggle className="mt-1 shrink-0" />
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-3xl" />
          ))}
        </div>
      )}

      {!loading && connections.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="Nothing here yet"
          body="When you send or receive a request, it'll show up here."
        />
      )}

      {!loading && connections.length > 0 && (
        <div className="space-y-7">
          {incoming.length > 0 && (
            <Group title="Requests for you">
              {incoming.map((c) => (
                <Row key={c.id} user={users[otherUid(c)]}>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={run(c.id, () => accept(c.id))}
                      loading={busy === c.id}
                    >
                      <Check className="size-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={run(c.id, () => decline(c.id))}
                      disabled={busy === c.id}
                    >
                      Decline
                    </Button>
                  </div>
                </Row>
              ))}
            </Group>
          )}

          {connected.length > 0 && (
            <Group title="Conversations">
              {connected.map((c) => {
                const u = users[otherUid(c)];
                const last = lastMessages[otherUid(c)];
                const mine = last?.from === myUid;
                return (
                  <ConversationRow
                    key={c.id}
                    user={u}
                    peerUid={otherUid(c)}
                    lastMessage={
                      last
                        ? {
                            text: last.text,
                            mine: !!mine,
                            at: last.createdAt,
                          }
                        : null
                    }
                  />
                );
              })}
            </Group>
          )}

          {sent.length > 0 && (
            <Group title="Sent">
              {sent.map((c) => (
                <Row key={c.id} user={users[otherUid(c)]}>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="size-3.5" /> Pending
                  </span>
                </Row>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  user,
  children,
}: {
  user?: User;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3">
      {user ? (
        <Avatar name={user.fullName} src={user.photoURL} size="md" />
      ) : (
        <div className="size-12 shrink-0 rounded-full bg-sand" />
      )}
      <Link
        href={user ? `/profile/${user.uid}` : "#"}
        className="min-w-0 flex-1"
      >
        <p className="truncate font-medium">{user?.fullName ?? "Student"}</p>
        {user && (
          <p className="truncate text-xs text-muted">{batchLabel(user.year)}</p>
        )}
      </Link>
      {children}
    </Card>
  );
}

function ConversationRow({
  user,
  peerUid,
  lastMessage,
}: {
  user?: User;
  peerUid: string;
  lastMessage: { text: string; mine: boolean; at: number } | null;
}) {
  return (
    <Link href={`/connections/${peerUid}`} className="block">
      <Card
        interactive
        className="flex items-center gap-3"
      >
        {user ? (
          <Avatar name={user.fullName} src={user.photoURL} size="md" />
        ) : (
          <div className="size-12 shrink-0 rounded-full bg-sand" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">
              {user?.fullName ?? "Student"}
            </p>
            {lastMessage && (
              <span className="shrink-0 text-[10px] text-faint">
                {formatRelativeTime(lastMessage.at)}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate text-xs",
              lastMessage ? "text-muted" : "text-faint italic",
            )}
          >
            {lastMessage
              ? `${lastMessage.mine ? "You: " : ""}${lastMessage.text}`
              : "Say hi — no messages yet."}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-faint" />
      </Card>
    </Link>
  );
}
