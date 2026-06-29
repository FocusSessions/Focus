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
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-6 flex-1">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-3xl font-bold text-white font-serif leading-[0] shadow-sm ring-4 ring-white dark:ring-[#1A1A1A]">
            {initial}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-[28px] font-bold text-brown leading-none">{displayName}</h1>
              <div className="flex items-center justify-center cursor-help mt-1">
                <RankBadgeIcon rankId={currentRank.id} className="w-6 h-6 drop-shadow-sm transition-transform hover:scale-110" />
              </div>
              {followAction && (
                <div className="ml-2">
                  {followAction}
                </div>
              )}
            </div>
            {username && (
              <p className="mt-1.5 text-[15px] font-medium text-brown-muted/90">@{username}</p>
            )}
            
            {activeProfile?.bio && (
              <p className="mt-4 text-[15px] text-brown/90 leading-relaxed max-w-xl whitespace-pre-wrap">
                {activeProfile.bio}
              </p>
            )}
            
            <div className="mt-5 pt-4 border-t border-black/5 w-full">
              {joinedLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!isGuest && isOwnProfile && needsSetup && (
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Complete Profile Setup
            </button>
          )}
          {isGuest && isOwnProfile && (
            <Link
              href="/auth"
              className="btn-secondary text-xs px-4 py-2"
            >
              Sign up to save progress
            </Link>
          )}
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brown-muted">
              Productivity Score
            </p>
            <p className="mt-0.5 text-2xl font-serif font-medium text-terracotta">
              <CountingNumber value={productivityScore} />
            </p>
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
