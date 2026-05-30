"use client";

import {
  Moon,
  Sparkles,
  Volume2,
  BookOpen,
  Lamp,
  Thermometer,
  Droplets,
  Users,
  Wallet,
  Compass,
  Map,
  HeartHandshake,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  moon: Moon,
  sparkles: Sparkles,
  "volume-2": Volume2,
  "book-open": BookOpen,
  lamp: Lamp,
  thermometer: Thermometer,
  droplets: Droplets,
  users: Users,
  wallet: Wallet,
  compass: Compass,
  map: Map,
  "heart-handshake": HeartHandshake,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = MAP[name] ?? CircleHelp;
  return <Icon className={className} />;
}
