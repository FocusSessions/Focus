"use client";

import type { ProfileStats } from "@/types/analytics";
import { formatDurationShort } from "@/lib/time";
import { Clock, Flame, Layers, BarChart3 } from "lucide-react";

interface StatsCardsProps {
  stats: ProfileStats;
}

const cardConfig = [
  {
    key: "hours",
    label: "Total Focus",
    icon: Clock,
    getValue: (s: ProfileStats) => formatDurationShort(s.totalFocusMs),
    bg: "bg-terracotta/10",
    text: "text-terracotta",
  },
  {
    key: "streak",
    label: "Current Streak",
    icon: Flame,
    getValue: (s: ProfileStats) => `${s.currentStreak}d`,
    bg: "bg-sage/10",
    text: "text-sage",
  },
  {
    key: "sessions",
    label: "Sessions",
    icon: Layers,
    getValue: (s: ProfileStats) => String(s.totalSessions),
    bg: "bg-brown/10",
    text: "text-brown",
  },
  {
    key: "avg",
    label: "Avg Session",
    icon: BarChart3,
    getValue: (s: ProfileStats) => formatDurationShort(s.averageSessionMs),
    bg: "bg-terracotta/10",
    text: "text-terracotta",
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cardConfig.map(({ key, label, icon: Icon, getValue, bg, text }) => (
        <div key={key} className="card flex flex-col items-start gap-2 px-4 py-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bg}`}>
            <Icon className={`h-4 w-4 ${text}`} />
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-brown-muted">
            {label}
          </p>
          <p className="font-serif text-2xl font-semibold text-brown">
            {getValue(stats)}
          </p>
        </div>
      ))}
    </div>
  );
}
