import { Flame } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";
import Link from "next/link";

interface ProfileHeaderProps {
  productivityScore: number;
  joinedLabel: string;
  currentStreak: number;
  isStreakSecuredToday: boolean;
}

export function ProfileHeader({ productivityScore, joinedLabel, currentStreak, isStreakSecuredToday }: ProfileHeaderProps) {
  const { current: currentRank } = determineRank(productivityScore);
  const { profile, isGuest } = useAuth();

  const displayName = profile?.display_name || profile?.username || "You";
  const initial = displayName[0]?.toUpperCase() || "Y";
  const username = profile?.username;

  return (
    <header className="mb-6 space-y-3">
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-2xl font-bold text-white font-serif leading-[0]">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-brown">{displayName}</h1>
              <div title={`Current Rank: ${currentRank.name}`} className="flex items-center justify-center cursor-help">
                <RankBadgeIcon rankId={currentRank.id} className="w-6 h-6 drop-shadow-sm transition-transform hover:scale-110" />
              </div>
            </div>
            {username && (
              <p className="text-sm text-brown-muted">@{username}</p>
            )}
            <p className="mt-0.5 text-sm text-brown-muted">{joinedLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isGuest && (
            <Link
              href="/auth"
              className="btn-primary text-xs px-4 py-2"
            >
              Sign up to save progress
            </Link>
          )}
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brown-muted">
              Productivity Score
            </p>
            <p className="mt-0.5 text-2xl font-serif font-medium text-terracotta">{productivityScore}</p>
          </div>
        </div>
      </div>

      {/* Streak card */}
      <div className="card px-5 py-3.5 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-dark">
          <Flame className="h-5 w-5 text-brown" />
        </div>
        <div>
          <p className="text-sm font-medium text-brown">
            {isStreakSecuredToday ? "Streak secured for today." : "Focus today to keep the streak alive."}
          </p>
          <p className="text-xs text-brown-muted">
            Current streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>
    </header>
  );
}
