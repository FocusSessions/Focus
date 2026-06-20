"use client";

import { useMemo, useState } from "react";
import { useFocus } from "@/context/focus-app";
import type { FocusSessionActivity } from "@/types";
import type { HeatmapGranularity } from "@/types/analytics";
import {
  computeStats,
  buildHeatmapData,
  buildWeeklyChartData,
  buildMonthlyChartData,
} from "@/lib/analytics";
import { generateWeeklyRecap } from "@/lib/weekly-recap";

import { ProfileHeader } from "@/components/profile/profile-header";
import { calculateProductivityScore } from "@/lib/score";
import { OverviewTab } from "@/components/profile/overview-tab";
import { ActivityTab } from "@/components/profile/activity-tab";
import { ProgressTab } from "@/components/profile/progress-tab";
import { AchievementsTab } from "@/components/profile/achievements-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";

type TabId = "overview" | "activity" | "progress" | "achievements";

export function ProfileShell() {
  const { activities, loadState, loadError, retryLoad, joinedAt } = useFocus();
  
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [granularity, setGranularity] = useState<HeatmapGranularity>("year");

  const focusSessions = useMemo(() => {
    return activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  }, [activities]);

  const recentSessions = useMemo(() => {
    return [...focusSessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 5);
  }, [focusSessions]);

  const joinedLabel = useMemo(() => {
    const timestamp = joinedAt || Date.now();
    return `Joined ${new Date(timestamp).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  }, [joinedAt]);

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

  // Calculate required data
  const stats = computeStats(focusSessions);
  const { score: productivityScore } = calculateProductivityScore(activities, joinedAt);
  const weeklyRecap = generateWeeklyRecap(activities);
  const heatmapDays = buildHeatmapData(focusSessions, granularity, joinedAt);

  // Chart Data
  const weeklyChartData = buildWeeklyChartData(focusSessions);
  const monthlyChartData = buildMonthlyChartData(focusSessions);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity" },
    { id: "progress", label: "Progress" },
    { id: "achievements", label: "Achievements" },
  ] as const;

  // Check if there is any focus session today
  const todayKey = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  const isStreakSecuredToday = focusSessions.some(
    s => new Date(s.startedAt).toLocaleDateString('en-CA') === todayKey
  );

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-36 pt-10">
      <ProfileHeader
        productivityScore={productivityScore}
        joinedLabel={joinedLabel}
        currentStreak={stats.currentStreak}
        isStreakSecuredToday={isStreakSecuredToday}
      />

      <div className="mb-4 overflow-x-auto scrollbar-hide pb-1">
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
    </div>
  );
}
