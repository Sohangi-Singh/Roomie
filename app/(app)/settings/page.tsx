"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ClipboardList, Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useMatchesStore } from "@/stores/matchesStore";
import { signOutUser } from "@/lib/firebase/auth";
import { updateUser, updateQuestionnaireProfile } from "@/lib/firebase/db";
import type { PublicProfile } from "@/lib/api/types";
import {
  Button,
  Input,
  Textarea,
  Field,
  Segmented,
  Chip,
  Card,
  Toggle,
} from "@/components/ui";
import { useThemeStore } from "@/stores/themeStore";
import { Brand } from "@/components/features/Brand";
import {
  HOSTEL_LIST,
  ROOM_TYPE_LABELS,
  allowedRoomTypes,
} from "@/config/hostels";
import { YEARS, COLLEGE_NAME } from "@/config/college";
import { defaultQuestionnaire } from "@/config/questionnaire";
import type { HostelId, RoomType, User, Year } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const myQ = useAuthStore((s) => s.questionnaire);
  const setAuth = useAuthStore((s) => s.setAuth);
  const hydrate = useOnboardingStore((s) => s.hydrate);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [form, setForm] = useState(() => ({
    fullName: me?.fullName ?? "",
    year: me?.year ?? (1 as Year),
    hostel: me?.hostel ?? ("uniworld1" as HostelId),
    roomType: me?.roomType ?? ("small_double" as RoomType),
    contactNumber: me?.contactNumber ?? "",
    instagram: me?.instagram ?? "",
    bio: me?.bio ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  const allowed = allowedRoomTypes(form.hostel, me.gender);
  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };
  const changeHostel = (h: HostelId) => {
    const opts = allowedRoomTypes(h, me.gender);
    update({
      hostel: h,
      roomType: opts.includes(form.roomType) ? form.roomType : opts[0],
    });
  };

  const valid =
    form.fullName.trim().length >= 2 &&
    /^\d{10}$/.test(form.contactNumber);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const patch: Partial<User> = {
        fullName: form.fullName.trim(),
        year: form.year,
        hostel: form.hostel,
        roomType: form.roomType,
        contactNumber: form.contactNumber,
        instagram: form.instagram.trim(),
        bio: form.bio.trim(),
      };
      const snapshot: PublicProfile = {
        uid: me.uid,
        fullName: form.fullName.trim(),
        year: form.year,
        gender: me.gender,
        hostel: form.hostel,
        roomType: form.roomType,
        ...(me.photoURL ? { photoURL: me.photoURL } : {}),
        ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
      };
      await updateUser(me.uid, patch);
      await updateQuestionnaireProfile(me.uid, snapshot);
      setAuth({ user: { ...me, ...patch, updatedAt: Date.now() } });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const redoQuiz = () => {
    hydrate(
      {
        fullName: me.fullName,
        year: me.year,
        gender: me.gender,
        hostel: me.hostel,
        roomType: me.roomType,
        contactNumber: me.contactNumber,
        instagram: me.instagram,
        bio: me.bio,
      },
      myQ ?? defaultQuestionnaire(me.uid),
    );
    router.push("/onboarding");
  };

  const logout = async () => {
    await signOutUser();
    useMatchesStore.getState().reset();
    router.replace("/");
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <Brand size="sm" />
      </header>

      <Card className="space-y-5">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <Field label="Full name">
          <Input
            value={form.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">Year</p>
          <Segmented
            options={YEARS.map((y) => ({ value: String(y), label: `Year ${y}` }))}
            value={String(form.year)}
            onChange={(v) => update({ year: Number(v) as Year })}
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Gender</p>
          <p className="text-sm text-muted">
            {me.gender === "male" ? "Male" : "Female"} · locked to keep matches
            within your gender
          </p>
        </div>
      </Card>

      <Card className="mt-4 space-y-5">
        <h2 className="font-display text-lg font-semibold">Living</h2>
        <div>
          <p className="mb-2 text-sm font-medium">Hostel</p>
          <Segmented
            options={HOSTEL_LIST.map((h) => ({ value: h.id, label: h.alias }))}
            value={form.hostel}
            onChange={(v) => changeHostel(v as HostelId)}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Room type</p>
          <div className="flex flex-wrap gap-2">
            {allowed.map((rt) => (
              <Chip
                key={rt}
                selected={form.roomType === rt}
                onClick={() => update({ roomType: rt })}
              >
                {ROOM_TYPE_LABELS[rt]}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Contact number">
          <Input
            type="tel"
            inputMode="numeric"
            value={form.contactNumber}
            onChange={(e) =>
              update({
                contactNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
          />
        </Field>
        <Field label="Instagram">
          <Input
            value={form.instagram}
            onChange={(e) => update({ instagram: e.target.value })}
            placeholder="@username"
          />
        </Field>
        <Field label="Short bio">
          <Textarea
            value={form.bio}
            onChange={(e) => update({ bio: e.target.value })}
            maxLength={160}
          />
        </Field>
      </Card>

      <div className="mt-4">
        <Button fullWidth size="lg" onClick={save} loading={saving} disabled={!valid}>
          {saved ? (
            <>
              <Check className="size-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>

      <Card className="mt-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Dark mode</p>
          <p className="text-xs text-muted">Easier on the eyes at night.</p>
        </div>
        <Toggle
          checked={theme === "dark"}
          onChange={(v) => setTheme(v ? "dark" : "light")}
        />
      </Card>

      <Card className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Compatibility quiz</p>
          <p className="text-xs text-muted">Update your lifestyle answers.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={redoQuiz}>
          <ClipboardList className="size-4" /> Redo
        </Button>
      </Card>

      <div className="mt-6">
        <Button variant="ghost" fullWidth onClick={logout} className="text-danger">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-faint">
        Roomie · {COLLEGE_NAME}
      </p>
    </div>
  );
}
