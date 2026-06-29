"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import type { Profile, CloudSession } from "@/types/supabase";
import type { FocusSessionActivity } from "@/types";
import {
  computeStats,
  buildHeatmapData,
  buildWeeklyChartData,
  buildMonthlyChartData,
} from "@/lib/analytics";
import { generateWeeklyRecap } from "@/lib/weekly-recap";
import { calculateProductivityScore } from "@/lib/score";
import { getLogicalDateKey } from "@/lib/time";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type { HeatmapGranularity } from "@/types/analytics";
import { toast } from "sonner";

import { ProfileHeader } from "@/components/profile/profile-header";
import { OverviewTab } from "@/components/profile/overview-tab";
import { ActivityTab } from "@/components/profile/activity-tab";
import { ProgressTab } from "@/components/profile/progress-tab";
import { AchievementsTab } from "@/components/profile/achievements-tab";
import { FollowListModal } from "@/components/profile/follow-list-modal";

import { UserPlus, UserCheck, Loader2 } from "lucide-react";

type TabId = "overview" | "activity" | "progress" | "achievements";

function cloudToLocal(session: CloudSession): FocusSessionActivity {
  return {
    id: session.id,
    type: "focus_session",
    title: session.title,
    description: session.description ?? undefined,
    durationMs: session.duration_ms,
    category: session.category as FocusSessionActivity["category"],
    visibility: session.visibility as FocusSessionActivity["visibility"],
    startedAt: new Date(session.started_at).getTime(),
    endedAt: new Date(session.ended_at).getTime(),
    createdAt: new Date(session.created_at).getTime(),
  };
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params.username;
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<FocusSessionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [granularity, setGranularity] = useState<HeatmapGranularity>("month");
  
  const [modalType, setModalType] = useState<"followers" | "following" | null>(null);

  // Load profile + sessions
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      // Fetch profile first (required to get the user ID for subsequent queries)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError || !profileData) {
        if (mounted) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      if (mounted) setProfile(profileData as Profile);

      // Run all remaining queries in parallel
      const [sessionsResult, followersResult, followingResult, followStatusResult] = await Promise.all([
        // Fetch public sessions
        supabase
          .from("sessions")
          .select("*")
          .eq("user_id", profileData.id)
          .eq("visibility", "public")
          .order("started_at", { ascending: false }),
        // Fetch follower count
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        // Fetch following count
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
        // Check if current user follows this profile
        user && user.id !== profileData.id
          ? supabase
              .from("follows")
              .select("follower_id")
              .eq("follower_id", user.id)
              .eq("following_id", profileData.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!mounted) return;

      if (sessionsResult.data) {
        setSessions(sessionsResult.data.map(cloudToLocal));
      }
      setFollowerCount(followersResult.count ?? 0);
      setFollowingCount(followingResult.count ?? 0);
      if (user && user.id !== profileData.id) {
        setIsFollowing(!!followStatusResult.data);
      }

      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [username, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFollow = useCallback(async () => {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
        
      if (error) {
        toast.error("Failed to unfollow: " + error.message);
      } else {
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: profile.id,
      });
      
      if (error) {
        if (error.code === '23505') {
          setIsFollowing(true);
        } else {
          toast.error("Failed to follow: " + error.message);
        }
      } else {
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    }

    setFollowLoading(false);
  }, [user, profile, isFollowing, followLoading]);

  const joinedAt = profile
    ? new Date(profile.created_at).getTime()
    : undefined;

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const { score: productivityScore } = useMemo(() => calculateProductivityScore(sessions, joinedAt), [sessions, joinedAt]);
  const weeklyRecap = useMemo(() => generateWeeklyRecap(sessions), [sessions]);
  const heatmapDays = useMemo(() => buildHeatmapData(sessions, granularity, joinedAt), [sessions, granularity, joinedAt]);
  const weeklyChartData = useMemo(() => buildWeeklyChartData(sessions), [sessions]);
  const monthlyChartData = useMemo(() => buildMonthlyChartData(sessions), [sessions]);
  
  const recentSessions = useMemo(() => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 5), [sessions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-terracotta" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-5xl font-serif font-bold text-terracotta/20">?</p>
          <h1 className="mt-4 font-serif text-2xl text-brown">User not found</h1>
          <p className="mt-2 text-sm text-brown-muted">
            @{username} doesn&apos;t exist or their profile is private.
          </p>
        </div>
      </div>
    );
  }

  const isSelf = user?.id === profile.id;
  
  const joinedLabel = new Date(profile.created_at).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity" },
    { id: "progress", label: "Progress" },
    { id: "achievements", label: "Achievements" },
  ] as const;

  const todayKey = getLogicalDateKey(Date.now());
  const isStreakSecuredToday = sessions.some(
    s => getLogicalDateKey(s.startedAt, s.timezoneOffset) === todayKey
  );

  const followersLabel = (
    <div className="flex items-center gap-4 mt-1">
      <button 
        onClick={() => setModalType("followers")}
        className="text-sm hover:opacity-80 transition-opacity focus:outline-none"
      >
        <span className="font-medium text-brown">{followerCount}</span>
        <span className="text-brown-muted ml-1">followers</span>
      </button>
      <button 
        onClick={() => setModalType("following")}
        className="text-sm hover:opacity-80 transition-opacity focus:outline-none"
      >
        <span className="font-medium text-brown">{followingCount}</span>
        <span className="text-brown-muted ml-1">following</span>
      </button>
    </div>
  );

  const followBtn = !isSelf ? (
    <button
      onClick={() => {
        if (!user) {
          router.push("/auth");
          return;
        }
        toggleFollow();
      }}
      disabled={followLoading}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-cozy ${
        isFollowing
          ? "border border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-terracotta"
          : "bg-terracotta text-white hover:bg-terracotta-hover"
      }`}
    >
      {followLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-3 w-3" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" />
          Follow
        </>
      )}
    </button>
  ) : undefined;

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-36 pt-10 relative">
      <ProfileHeader
        productivityScore={productivityScore}
        joinedLabel={followersLabel}
        currentStreak={stats.currentStreak}
        isStreakSecuredToday={isStreakSecuredToday}
        userProfile={profile}
        followAction={followBtn}
      />

      <div className="relative mb-4">
        <div className="overflow-x-auto scrollbar-hide pb-1">
          <div className="flex w-max items-center rounded-full border border-border/50 bg-surface/80 backdrop-blur-md p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-cozy focus:outline-none ${
                  activeTab === tab.id
                    ? "bg-terracotta text-white"
                    : "text-brown-muted hover:bg-cream hover:text-brown"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-cream dark:from-[#0d0c0b] to-transparent z-10" />
      </div>

      <main>
        <ErrorBoundary title="Failed to load tab">
          {sessions.length === 0 ? (
            <div className="card flex min-h-[160px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
              <p className="font-medium text-brown">No public sessions</p>
              <p className="mt-1 text-sm text-brown-muted">
                This user hasn&apos;t shared any sessions publicly yet.
              </p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  stats={stats}
                  weeklyRecap={weeklyRecap}
                  heatmapDays={heatmapDays}
                  allSessions={sessions}
                  recentSessions={recentSessions}
                  granularity={granularity}
                  onGranularityChange={setGranularity}
                />
              )}
              {activeTab === "activity" && (
                <ActivityTab 
                  heatmapDays={heatmapDays}
                  granularity={granularity}
                  onGranularityChange={setGranularity}
                />
              )}
              {activeTab === "progress" && (
                <ProgressTab 
                  weeklyData={weeklyChartData}
                  monthlyData={monthlyChartData}
                  joinedAt={joinedAt}
                />
              )}
              {activeTab === "achievements" && (
                <AchievementsTab activities={sessions} joinedAt={joinedAt} productivityScore={productivityScore} />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {modalType && profile && (
        <FollowListModal 
          userId={profile.id} 
          type={modalType} 
          onClose={() => setModalType(null)} 
        />
      )}
    </div>
  );
}
