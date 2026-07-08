// @ts-ignore - TS 5.7 moduleResolution: bundler bug with Next.js dynamic imports
import dynamic from "next/dynamic";
import { Flame } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";
import Link from "next/link";
import type { Profile } from "@/types/supabase";
import { useState } from "react";
// Lazy-load dialog — only rendered when user clicks 'Complete Profile Setup'
const EditProfileDialog = dynamic(() => import("@/components/profile/edit-profile-dialog").then(m => ({ default: m.EditProfileDialog })), { ssr: false });
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
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 mb-3 sm:mb-5">
          {/* Left: Avatar + Details */}
          <div className="flex items-start gap-5 w-full sm:w-auto flex-1">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-2xl font-bold text-white font-serif shadow-sm">
              {initial}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 w-full pr-1 sm:pr-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-[24px] md:text-[32px] font-bold text-brown leading-none">{displayName}</h1>
                  <div className="flex items-center justify-center cursor-help">
                    <RankBadgeIcon rankId={currentRank.id} className="w-5 h-5 drop-shadow-sm transition-transform hover:scale-110" />
                  </div>
                  {followAction && (
                    <div className="ml-1 mt-1">
                      {followAction}
                    </div>
                  )}
                </div>
                {/* Mobile Score */}
                <div className="sm:hidden text-2xl font-serif font-medium text-terracotta leading-none shrink-0">
                  <CountingNumber value={productivityScore} />
                </div>
              </div>
              {username && (
                <p className="mt-1 text-[14px] text-brown-muted/90">@{username}</p>
              )}
              {activeProfile?.bio && (
                <p className="mt-2 text-[14px] text-brown/90 leading-relaxed max-w-xl whitespace-pre-wrap">
                  {activeProfile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right: Score & Actions */}
          <div className={`${isOwnProfile && (needsSetup || isGuest) ? 'flex' : 'hidden sm:flex'} flex-col items-end shrink-0 gap-3 w-full sm:w-auto`}>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brown-muted mb-0.5">
                Productivity Score
              </p>
              <div className="flex items-baseline justify-end gap-2">
                <p className="text-3xl font-serif font-medium text-terracotta leading-none">
                  <CountingNumber value={productivityScore} />
                </p>
              </div>
            </div>
            {isOwnProfile && (needsSetup || isGuest) && (
              <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0 pt-4 sm:pt-0 border-t border-border/40 sm:border-none">
                {!isGuest && needsSetup && (
                  <button
                    onClick={() => setIsEditDialogOpen(true)}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Complete Profile Setup</span>
                    <span className="sm:hidden">Setup</span>
                  </button>
                )}
                {isGuest && (
                  <Link
                    href="/auth"
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Sign up <span className="hidden sm:inline">to save progress</span>
                  </Link>
                )}
              </div>
            )}
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
