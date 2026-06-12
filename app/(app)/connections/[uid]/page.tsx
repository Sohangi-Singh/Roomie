"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AtSign, Phone, Send } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useChat } from "@/hooks/useChat";
import { useConnectionWith } from "@/hooks/useConnections";
import { markChatSeen } from "@/hooks/useInboxBadge";
import { getUser } from "@/lib/firebase/db";
import { Avatar, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { batchLabel } from "@/config/college";
import type { User } from "@/types";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const otherUid = params.uid;
  const me = useAuthStore((s) => s.fbUser);

  const { conn, loading: connLoading } = useConnectionWith(otherUid);
  const {
    messages,
    loading: msgsLoading,
    error: chatError,
    send,
  } = useChat(otherUid);
  const [other, setOther] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (otherUid) {
      void getUser(otherUid).then((u) => {
        if (!cancelled) setOther(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [otherUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    // Anything visible has been "seen" — keeps the DMs badge in sync.
    if (otherUid) markChatSeen(otherUid);
  }, [messages.length, otherUid]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || !me) return;
    setSending(true);
    setError(null);
    try {
      await send(body);
      setText("");
    } catch {
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (!me) return null;

  if (connLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted">Loading…</div>
    );
  }

  if (!conn || conn.status !== "accepted") {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted">
          You can chat once you&apos;re both connected.
        </p>
        <button
          type="button"
          onClick={() => router.push("/connections")}
          className="mt-4 text-sm font-medium text-accent-700"
        >
          ← Back to DMs
        </button>
      </div>
    );
  }

  const handle = other?.instagram?.replace(/^@/, "");

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      {/* header */}
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-canvas/85 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/connections")}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        {other && <Avatar name={other.fullName} src={other.photoURL} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {other?.fullName ?? "…"}
          </p>
          {other && (
            <p className="truncate text-[11px] text-muted">
              {batchLabel(other.year)}
            </p>
          )}
        </div>
        {other && (
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${other.contactNumber}`}
              className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand hover:text-accent-700"
              aria-label="Call"
            >
              <Phone className="size-4" />
            </a>
            {handle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand hover:text-accent-700"
                aria-label="Instagram"
              >
                <AtSign className="size-4" />
              </a>
            )}
          </div>
        )}
      </header>

      {/* messages */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4" aria-live="polite">
        {msgsLoading && !chatError && (
          <p className="py-6 text-center text-xs text-faint">Loading…</p>
        )}
        {chatError && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-danger-soft px-4 py-3 text-center">
            <p className="text-sm font-medium text-danger">{chatError}</p>
            <p className="mt-1 text-xs text-muted">
              Check your connection and refresh the page to try again.
            </p>
          </div>
        )}
        {!msgsLoading && !chatError && messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted">
              No messages yet. Say hi to{" "}
              {other?.fullName?.split(" ")[0] ?? "them"} 👋
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.from === me.uid;
          const prev = messages[i - 1];
          const sameSender = prev && prev.from === m.from;
          return (
            <div
              key={m.id}
              className={cn(
                "flex",
                mine ? "justify-end" : "justify-start",
                sameSender ? "mt-0.5" : "mt-2",
              )}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  mine
                    ? "bg-accent-500 text-canvas"
                    : "bg-surface text-ink shadow-soft ring-1 ring-line",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px]",
                    mine ? "text-accent-100/80" : "text-faint",
                  )}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="sticky bottom-24 -mx-4 mt-3 border-t border-line bg-canvas/85 px-4 py-3 backdrop-blur lg:bottom-4">
        {error && (
          <p className="mb-2 text-center text-xs text-danger">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            loading={sending}
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
