import { Flame } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";
import Link from "next/link";
import type { Profile } from "@/types/supabase";
import { useState } from "react";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { Settings2 } from "lucide-react";
import { CountingNumber } from "@/components/ui/counting-number";

interface ProfileHeaderProps {
  productivityScore: number;
  joinedLabel: React.ReactNode;
  currentStreak: number;
  isStreakSecuredToday: boolean;
  userProfile?: Profile | null;
  followAction?: React.ReactNode;
}

export function ProfileHeader({ productivityScore, joinedLabel, currentStreak, isStreakSecuredToday, userProfile, followAction }: ProfileHeaderProps) {
  const { current: currentRank } = determineRank(productivityScore);
  const { user, profile: currentUser, isGuest } = useAuth();

  const activeProfile = userProfile || currentUser;
  const isOwnProfile = !userProfile || (currentUser?.id === userProfile.id);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const displayName = activeProfile?.display_name || activeProfile?.username || "You";
  const initial = displayName[0]?.toUpperCase() || "Y";
  const username = activeProfile?.username;
  
  const hasSetupProfile = user?.user_metadata?.has_setup_profile === true || !!activeProfile?.username;

  const needsSetup = !hasSetupProfile;

  return (
    <header className="mb-6 space-y-3">
      <div className="card p-5 sm:p-7 flex flex-col">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-5">
          {/* Left: Avatar + Details */}
          <div className="flex items-center gap-5 sm:gap-6 w-full sm:w-auto">
            <div className="flex h-[76px] w-[76px] sm:h-[88px] sm:w-[88px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-3xl sm:text-4xl font-bold text-white font-serif leading-[0] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              {initial}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-brown leading-none tracking-tight">{displayName}</h1>
                <div className="flex items-center justify-center cursor-help mt-1">
                  <RankBadgeIcon rankId={currentRank.id} className="w-[22px] h-[22px] drop-shadow-sm transition-transform hover:scale-110" />
                </div>
                {followAction && (
                  <div className="ml-1 mt-1">
                    {followAction}
                  </div>
                )}
              </div>
              {username && (
                <p className="text-[15px] sm:text-[16px] text-brown-muted/90 font-medium tracking-tight">@{username}</p>
              )}
              {activeProfile?.bio && (
                <p className="text-[15px] text-brown/90 leading-relaxed max-w-xl whitespace-pre-wrap mt-2 sm:mt-2.5">
                  {activeProfile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right: Score & Actions */}
          <div className="flex flex-col sm:items-end gap-3 mt-4 sm:mt-0 shrink-0">
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brown-muted/70 mb-1 sm:mb-1.5">
                Productivity Score
              </p>
              <div className="flex items-baseline sm:justify-end gap-2">
                <p className="text-[52px] sm:text-[64px] font-serif font-medium text-[#ea580c] dark:text-[#f97316] leading-none tracking-tight drop-shadow-sm">
                  <CountingNumber value={productivityScore} />
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
              {!isGuest && isOwnProfile && needsSetup && (
                <button
                  onClick={() => setIsEditDialogOpen(true)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Complete Profile Setup
                </button>
              )}
              {isGuest && isOwnProfile && (
                <Link
                  href="/auth"
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Sign up to save progress
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black/5 dark:bg-white/5 mb-4" />

        {/* Bottom Section */}
        <div className="w-full">
          {joinedLabel}
        </div>
      </div>

      {/* Streak card */}
      <div className="card px-5 py-3.5 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-dark">
          <Flame className="h-5 w-5 text-brown" />
        </div>
        <div>
          <p className="text-sm font-medium text-brown">
            {currentStreak === 0 
              ? "Start your first session to begin a streak." 
              : isStreakSecuredToday 
                ? "Streak secured for today." 
                : "Focus today to keep the streak alive."}
          </p>
          <p className="text-xs text-brown-muted">
            Current streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      {isEditDialogOpen && (
        <EditProfileDialog onClose={() => setIsEditDialogOpen(false)} />
      )}
    </header>
  );
}
