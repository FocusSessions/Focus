"use client";

import { useMemo, useState, useEffect } from "react";
import { useFocus } from "@/context/focus-app";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import type { FocusSessionActivity } from "@/types";
import type { HeatmapGranularity } from "@/types/analytics";
import {
  computeStats,
  buildHeatmapData,
  buildWeeklyChartData,
  buildMonthlyChartData,
} from "@/lib/analytics";
import { generateWeeklyRecap } from "@/lib/weekly-recap";
import { getLogicalDateKey } from "@/lib/time";

import { ProfileHeader } from "@/components/profile/profile-header";
import { calculateProductivityScore } from "@/lib/score";
import { OverviewTab } from "@/components/profile/overview-tab";
import { ActivityTab } from "@/components/profile/activity-tab";
import { ProgressTab } from "@/components/profile/progress-tab";
import { AchievementsTab } from "@/components/profile/achievements-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FollowListModal } from "@/components/profile/follow-list-modal";

type TabId = "overview" | "activity" | "progress" | "achievements";

export function ProfileShell() {
  const { activities, loadState, loadError, retryLoad, joinedAt } = useFocus();
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [granularity, setGranularity] = useState<HeatmapGranularity>("month");
  
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [modalType, setModalType] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;

    const loadFollows = async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id),
      ]);

      if (mounted) {
        setFollowerCount(followers ?? 0);
        setFollowingCount(following ?? 0);
      }
    };

    loadFollows();
    return () => { mounted = false; };
  }, [profile?.id]);

  const focusSessions = useMemo(() => {
    return activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  }, [activities]);

  const recentSessions = useMemo(() => {
    return [...focusSessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 5);
  }, [focusSessions]);

  const joinedDateLabel = useMemo(() => {
    const timestamp = joinedAt || Date.now();
    return `Joined ${new Date(timestamp).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  }, [joinedAt]);

  const followersLabel = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-y-3 sm:gap-y-0 gap-x-6 pt-2">
      <div className="flex items-center gap-4 sm:gap-6">
        <button 
          onClick={() => setModalType("followers")}
          className="group flex items-center gap-1.5 text-[14px] hover:opacity-80 transition-opacity focus:outline-none"
        >
          <span className="font-bold text-brown">{followerCount}</span>
          <span className="text-brown-muted font-medium group-hover:text-brown transition-colors">Followers</span>
        </button>

        <div className="w-px h-4 bg-black/10 dark:bg-white/10" />

        <button 
          onClick={() => setModalType("following")}
          className="group flex items-center gap-1.5 text-[14px] hover:opacity-80 transition-opacity focus:outline-none"
        >
          <span className="font-bold text-brown">{followingCount}</span>
          <span className="text-brown-muted font-medium group-hover:text-brown transition-colors">Following</span>
        </button>
      </div>

      <div className="w-px h-4 bg-black/10 dark:bg-white/10 hidden sm:block" />

      <div className="flex items-center gap-1.5 text-[14px] text-brown-muted font-medium">
        <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {joinedDateLabel}
      </div>
    </div>
  );

  // Calculate required data — memoized to avoid recomputation on every render
  const stats = useMemo(() => computeStats(focusSessions), [focusSessions]);
  const { score: productivityScore } = useMemo(() => calculateProductivityScore(activities, joinedAt), [activities, joinedAt]);
  const weeklyRecap = useMemo(() => generateWeeklyRecap(activities), [activities]);
  const heatmapDays = useMemo(() => buildHeatmapData(focusSessions, granularity, joinedAt), [focusSessions, granularity, joinedAt]);

  // Chart Data
  const weeklyChartData = useMemo(() => buildWeeklyChartData(focusSessions), [focusSessions]);
  const monthlyChartData = useMemo(() => buildMonthlyChartData(focusSessions), [focusSessions]);

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <p className="text-brown-muted">Loading your profile…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <p className="text-brown">{loadError}</p>
        <button type="button" className="btn-primary mt-4" onClick={retryLoad}>
          Try again
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity" },
    { id: "progress", label: "Progress" },
    { id: "achievements", label: "Achievements" },
  ] as const;

  // Check if there is any focus session today
  const todayKey = getLogicalDateKey(Date.now());
  const isStreakSecuredToday = focusSessions.some(
    s => getLogicalDateKey(s.startedAt, s.timezoneOffset) === todayKey
  );

  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-8 pb-24 md:pb-10 pt-6 md:pt-10">
      <ProfileHeader
        productivityScore={productivityScore}
        joinedLabel={followersLabel}
        currentStreak={stats.currentStreak}
        isStreakSecuredToday={isStreakSecuredToday}
      />

      <div className="relative mb-4">
        <div className="overflow-x-auto scrollbar-hide pb-1">
          <div className="flex w-max items-center rounded-full border border-border/50 bg-surface/80 backdrop-blur-md p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-cozy outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  activeTab === tab.id
                    ? "bg-terracotta text-white shadow-sm"
                    : "text-brown-muted hover:bg-cream hover:text-brown"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-cream dark:from-[#0d0c0b] to-transparent z-10" />
      </div>

      <main>
        <ErrorBoundary title="Failed to load tab">
          {activeTab === "overview" && (
            <OverviewTab
              stats={stats}
              weeklyRecap={weeklyRecap}
              heatmapDays={heatmapDays}
              allSessions={focusSessions}
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
            <AchievementsTab activities={activities} joinedAt={joinedAt} productivityScore={productivityScore} />
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
