"use client";

import { useState } from "react";
import { Phone, AtSign, Check, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { useConnectionWith } from "@/hooks/useConnections";
import type { User } from "@/types";

export function ConnectButton({ target }: { target: User }) {
  const { conn, loading, myUid, send, accept, decline } = useConnectionWith(
    target.uid,
  );
  const [busy, setBusy] = useState(false);

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="shimmer h-12 w-full rounded-2xl" aria-hidden />;
  }

  if (conn?.status === "accepted") {
    return <ContactReveal user={target} />;
  }

  if (conn?.status === "pending") {
    if (conn.from === myUid) {
      return (
        <Button fullWidth size="lg" variant="secondary" disabled>
          <Clock className="size-4" /> Request sent
        </Button>
      );
    }
    return (
      <div className="flex gap-3">
        <Button fullWidth size="lg" onClick={run(accept)} loading={busy}>
          <Check className="size-4" /> Accept
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="outline"
          onClick={run(decline)}
          disabled={busy}
        >
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button fullWidth size="lg" onClick={run(() => send())} loading={busy}>
      <Send className="size-4" />
      {conn?.status === "declined" ? "Send again" : "Send request"}
    </Button>
  );
}

function ContactReveal({ user }: { user: User }) {
  const handle = user.instagram?.replace(/^@/, "");
  return (
    <div className="rounded-2xl bg-success-soft p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-success">
        <Check className="size-4" /> You&apos;re connected
      </p>
      <div className="flex flex-col gap-2.5">
        <a
          href={`tel:${user.contactNumber}`}
          className="flex items-center gap-2 text-sm text-ink"
        >
          <Phone className="size-4 text-accent-600" /> {user.contactNumber}
        </a>
        {handle && (
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-ink"
          >
            <AtSign className="size-4 text-accent-600" /> {handle}
          </a>
        )}
      </div>
    </div>
  );
}
