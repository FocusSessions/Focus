"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import type { Profile, CloudSession } from "@/types/supabase";
import type { FocusSessionActivity } from "@/types";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";
import { computeStats, buildHeatmapData } from "@/lib/analytics";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import { formatDurationShort } from "@/lib/time";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  UserPlus,
  UserCheck,
  Loader2,
  Flame,
  Calendar,
  Clock,
  Trophy,
} from "lucide-react";
import type { HeatmapGranularity } from "@/types/analytics";

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
  const [granularity, setGranularity] = useState<HeatmapGranularity>("year");

  // Load profile + sessions
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      // Fetch profile
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

      // Fetch public sessions
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", profileData.id)
        .eq("visibility", "public")
        .order("started_at", { ascending: false });

      if (mounted && sessionData) {
        setSessions(sessionData.map(cloudToLocal));
      }

      // Fetch follower/following counts
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
      ]);

      if (mounted) {
        setFollowerCount(followers ?? 0);
        setFollowingCount(following ?? 0);
      }

      // Check if current user follows this profile
      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .maybeSingle();

        if (mounted) setIsFollowing(!!followData);
      }

      if (mounted) setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [username, user]);

  const toggleFollow = useCallback(async () => {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: profile.id,
      });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }

    setFollowLoading(false);
  }, [user, profile, isFollowing, followLoading]);

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const joinedAt = profile
    ? new Date(profile.created_at).getTime()
    : undefined;

  const heatmapDays = useMemo(
    () => buildHeatmapData(sessions, granularity, joinedAt),
    [sessions, granularity, joinedAt]
  );

  const { current: currentRank } = useMemo(() => {
    // Approximate score from public data
    const totalHrs = sessions.reduce((s, a) => s + a.durationMs, 0) / 3600000;
    return determineRank(Math.round(totalHrs * 10));
  }, [sessions]);

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

  const initial =
    (profile.display_name || profile.username)[0]?.toUpperCase() || "?";
  const isSelf = user?.id === profile.id;

  const joinedLabel = new Date(profile.created_at).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-36 pt-10">
      {/* Profile Header */}
      <header className="mb-6 space-y-3">
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-2xl font-bold text-white font-serif leading-[0]">
                {initial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-medium text-brown">
                    {profile.display_name || profile.username}
                  </h1>
                  <div className="flex items-center justify-center cursor-help">
                    <RankBadgeIcon
                      rankId={currentRank.id}
                      className="w-6 h-6 drop-shadow-sm transition-transform hover:scale-110"
                    />
                  </div>
                </div>
                <p className="text-sm text-brown-muted">@{profile.username}</p>
                {profile.bio && (
                  <p className="mt-1 text-sm text-brown-muted">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Follow button or badge */}
            <div className="flex items-center gap-4">
              {!isSelf && user && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-cozy ${
                    isFollowing
                      ? "border border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-terracotta"
                      : "bg-terracotta text-white hover:bg-terracotta-hover"
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex items-center gap-6 border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5 text-brown-muted" />
              <span className="text-brown-muted">Joined {joinedLabel}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-brown">{followerCount}</span>
              <span className="text-brown-muted"> followers</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-brown">{followingCount}</span>
              <span className="text-brown-muted"> following</span>
            </div>
          </div>
        </div>

        {/* Streak */}
        {stats.currentStreak > 0 && (
          <div className="card px-5 py-3.5 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-dark">
              <Flame className="h-5 w-5 text-brown" />
            </div>
            <div>
              <p className="text-sm font-medium text-brown">
                {stats.currentStreak} day streak
              </p>
              <p className="text-xs text-brown-muted">
                Longest: {stats.longestStreak} days
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Quick Stats */}
      <ErrorBoundary title="Failed to load quick stats">
        <div className="mb-6 grid grid-cols-3 gap-2 md:gap-3">
          <div className="card p-3 md:p-4 text-center">
            <Clock className="mx-auto mb-1 h-4 w-4 text-brown-muted" />
            <p className="text-lg font-serif font-medium text-brown">
              {formatDurationShort(stats.totalFocusMs)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-brown-muted">
              Total Focus
            </p>
          </div>
          <div className="card p-3 md:p-4 text-center">
            <Trophy className="mx-auto mb-1 h-4 w-4 text-brown-muted" />
            <p className="text-lg font-serif font-medium text-brown">
              {stats.totalSessions}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-brown-muted">
              Sessions
            </p>
          </div>
          <div className="card p-3 md:p-4 text-center">
            <Flame className="mx-auto mb-1 h-4 w-4 text-brown-muted" />
            <p className="text-lg font-serif font-medium text-brown">
              {stats.longestStreak}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-brown-muted">
              Best Streak
            </p>
          </div>
        </div>
      </ErrorBoundary>

      {/* Heatmap */}
      {sessions.length > 0 && (
        <ErrorBoundary title="Failed to load activity heatmap">
          <section className="card p-5">
            <h2 className="mb-4 font-serif text-lg text-brown">Activity</h2>
            <ActivityHeatmap
              days={heatmapDays}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />
          </section>
        </ErrorBoundary>
      )}

      {sessions.length === 0 && (
        <div className="card flex min-h-[160px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
          <p className="font-medium text-brown">No public sessions</p>
          <p className="mt-1 text-sm text-brown-muted">
            This user hasn&apos;t shared any sessions publicly yet.
          </p>
        </div>
      )}
    </div>
  );
}
