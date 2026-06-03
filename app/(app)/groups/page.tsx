"use client";

import { useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useCurrentUser } from "@/hooks/useAuth";
import { GroupCard } from "@/components/features/GroupCard";
import { EmptyState } from "@/components/features/EmptyState";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import {
  BottomSheet,
  Button,
  Field,
  Input,
  Segmented,
  Chip,
  SkeletonCard,
} from "@/components/ui";
import {
  HOSTELS,
  ROOM_TYPE_LABELS,
  allowedRoomTypes,
  roomTypeToGroupSize,
} from "@/config/hostels";
import { createGroup } from "@/lib/firebase/db";
import type { HostelId, RoomType, User } from "@/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function GroupsPage() {
  const me = useCurrentUser();
  const { mine, open, loading, reload, join } = useGroups();
  const [sheet, setSheet] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      await join(id);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Groups</h1>
          <p className="mt-1 text-sm text-muted">Team up to fill a room.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" onClick={() => setSheet(true)}>
            <Plus className="size-4" /> New
          </Button>
        </div>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <Section title="Your groups">
            {mine.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No groups yet"
                body="Create a group and invite the roommates you've matched with."
                action={
                  <Button variant="secondary" onClick={() => setSheet(true)}>
                    Create a group
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {mine.map((g) => (
                  <GroupCard key={g.id} group={g} isMember />
                ))}
              </div>
            )}
          </Section>

          <Section title="Open groups to join">
            {open.length === 0 ? (
              <p className="rounded-3xl bg-surface px-5 py-8 text-center text-sm text-muted shadow-soft">
                No open groups right now.
              </p>
            ) : (
              <div className="space-y-3">
                {open.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    onJoin={() => handleJoin(g.id)}
                    joining={joiningId === g.id}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Create a group"
      >
        {me && (
          <CreateGroupForm
            me={me}
            onCreated={async () => {
              setSheet(false);
              await reload();
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function CreateGroupForm({
  me,
  onCreated,
}: {
  me: User;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  // Pick the first hostel the user is open to, defaulting to U1.
  const [hostel, setHostel] = useState<HostelId>(
    me.hostelPrefs[0] ?? "uniworld1",
  );
  // The user's room-type prefs filtered to what's allowed in this hostel.
  const allowedForHostel = allowedRoomTypes(hostel, me.gender);
  const allowed: RoomType[] = allowedForHostel.filter((rt) =>
    me.roomTypePrefs.includes(rt),
  );
  const [roomType, setRoomType] = useState<RoomType>(
    allowed[0] ?? allowedForHostel[0],
  );
  const [busy, setBusy] = useState(false);

  const changeHostel = (h: HostelId) => {
    setHostel(h);
    const opts = allowedRoomTypes(h, me.gender);
    const intersect = opts.filter((rt) => me.roomTypePrefs.includes(rt));
    const pool = intersect.length > 0 ? intersect : opts;
    if (!pool.includes(roomType)) setRoomType(pool[0]);
  };

  const submit = async () => {
    if (name.trim().length < 2) return;
    setBusy(true);
    const size = roomTypeToGroupSize(roomType);
    try {
      await createGroup({
        name: name.trim(),
        ownerUid: me.uid,
        memberUids: [me.uid],
        size,
        openSlots: size - 1,
        hostel,
        roomType,
        gender: me.gender,
        status: "open",
        createdAt: Date.now(),
      });
      await onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Group name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Quiet & tidy crew"
          maxLength={40}
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Hostel</p>
        <Segmented
          options={me.hostelPrefs.map((h) => ({
            value: h,
            label: HOSTELS[h].alias,
          }))}
          value={hostel}
          onChange={(v) => changeHostel(v as HostelId)}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Room type</p>
        <div className="flex flex-wrap gap-2">
          {allowed.map((rt) => (
            <Chip
              key={rt}
              selected={roomType === rt}
              onClick={() => setRoomType(rt)}
            >
              {ROOM_TYPE_LABELS[rt]}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-faint">
          Sharing size: {roomTypeToGroupSize(roomType)} people.
        </p>
      </div>
      <Button
        fullWidth
        size="lg"
        onClick={submit}
        loading={busy}
        disabled={name.trim().length < 2}
      >
        Create group
      </Button>
    </div>
  );
}
