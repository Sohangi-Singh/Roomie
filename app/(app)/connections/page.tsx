"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Check, Phone, AtSign, Clock } from "lucide-react";
import { useConnections } from "@/hooks/useConnections";
import { markInboxSeen } from "@/hooks/useInboxBadge";
import { getUser } from "@/lib/firebase/db";
import { Avatar, Card, Button, Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/features/EmptyState";
import type { Connection, User } from "@/types";

export default function ConnectionsPage() {
  const { connections, loading, accept, decline, myUid } = useConnections();
  const [users, setUsers] = useState<Record<string, User>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Clear the DMs nav badge as soon as the page mounts.
  useEffect(() => {
    markInboxSeen();
  }, []);

  useEffect(() => {
    if (!myUid) return;
    const others = [
      ...new Set(connections.map((c) => (c.from === myUid ? c.to : c.from))),
    ];
    let active = true;
    // Promise.all([]) resolves to [] → clears the map when there are none.
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
  const connected = connections.filter((c) => c.status === "accepted");

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">DMs</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          DM your requests and discuss the grey areas with them if need be.
        </p>
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
            <Group title="Connected">
              {connected.map((c) => {
                const u = users[otherUid(c)];
                const handle = u?.instagram?.replace(/^@/, "");
                return (
                  <Row key={c.id} user={u}>
                    {u && (
                      <div className="flex flex-col items-end gap-1 text-xs">
                        <a
                          href={`tel:${u.contactNumber}`}
                          className="flex items-center gap-1 text-accent-700"
                        >
                          <Phone className="size-3.5" /> {u.contactNumber}
                        </a>
                        {handle && (
                          <a
                            href={`https://instagram.com/${handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-accent-700"
                          >
                            <AtSign className="size-3.5" /> {handle}
                          </a>
                        )}
                      </div>
                    )}
                  </Row>
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
          <p className="truncate text-xs text-muted">Year {user.year}</p>
        )}
      </Link>
      {children}
    </Card>
  );
}
