"use client";

import { useEffect, useState, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import type { FocusSessionActivity } from "@/types";
import type { Profile, CloudSession } from "@/types/supabase";
import { formatDurationShort, formatTimeRange, dayLabel, getLogicalDateKey } from "@/lib/time";
import { Users, Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedItem {
  session: FocusSessionActivity;
  profile?: Profile;
}

function cloudToLocal(s: CloudSession): FocusSessionActivity {
  return {
    id: s.id,
    type: "focus_session",
    title: s.title,
    description: s.description ?? undefined,
    durationMs: s.duration_ms,
    category: s.category as FocusSessionActivity["category"],
    visibility: s.visibility as FocusSessionActivity["visibility"],
    startedAt: new Date(s.started_at).getTime(),
    endedAt: new Date(s.ended_at).getTime(),
    createdAt: new Date(s.created_at).getTime(),
  };
}

function FeedItemCard({
  session,
  profile,
  currentUser,
  followingIds,
  loadingFollow,
  toggleFollow,
}: {
  session: FocusSessionActivity;
  profile?: Profile;
  currentUser: any;
  followingIds: Set<string>;
  loadingFollow: Set<string>;
  toggleFollow: (id: string, e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={`card rounded-cozy p-5 break-inside-avoid mb-4 transition-all duration-300 ${session.description ? 'cursor-pointer hover:bg-brown/5' : ''}`}
      onClick={() => session.description && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {profile && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentUser?.id === profile.id) {
                    router.push('/profile');
                  } else {
                    router.push(`/user/${profile.username}`);
                  }
                }}
                className="flex min-w-0 items-center gap-2 group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-[12px] font-bold text-white">
                  {(profile.display_name || profile.username)[0]?.toUpperCase()}
                </div>
                <span className="truncate text-xs font-medium text-brown group-hover:text-terracotta transition-colors">
                  {profile.display_name || profile.username}
                </span>
                <span className="truncate text-[10px] text-brown-muted">
                  @{profile.username}
                </span>
              </button>

              {currentUser && currentUser.id !== profile.id && (
                <button
                  onClick={(e) => toggleFollow(profile.id, e)}
                  disabled={loadingFollow.has(profile.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 disabled:opacity-50 ${
                    followingIds.has(profile.id)
                      ? "border border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-terracotta"
                      : "bg-terracotta/10 text-terracotta hover:bg-terracotta hover:text-white"
                  }`}
                >
                  {loadingFollow.has(profile.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : followingIds.has(profile.id) ? (
                    <><Check className="h-3 w-3" />Following</>
                  ) : (
                    <><Plus className="h-3 w-3" />Follow</>
                  )}
                </button>
              )}
            </div>
          )}

          <h2 className="truncate font-medium text-brown">
            {session.title || "Untitled Session"}
          </h2>
          <p className="mt-1 text-xs text-brown-muted capitalize">
            {session.category || "other"} •{" "}
            {dayLabel(getLogicalDateKey(session.startedAt))}
          </p>
          <p className="mt-0.5 text-xs text-brown-muted">
            {formatTimeRange(session.startedAt, session.endedAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-medium text-sage">
            {formatDurationShort(session.durationMs)}
          </span>
          <span className="rounded-md border border-border bg-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brown-muted">
            {session.visibility}
          </span>
        </div>
      </div>
      
      {isExpanded && session.description && (
        <div className="mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 text-sm text-brown-muted">
          {session.description}
        </div>
      )}
    </article>
  );
}

export function FeedShell() {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loadingFollow, setLoadingFollow] = useState<Set<string>>(new Set());
  const [userForcedGlobal, setUserForcedGlobal] = useState(false);
  const [isRecommendingGlobal, setIsRecommendingGlobal] = useState(false);
  const [feedRefetch, triggerFeedRefetch] = useReducer((n: number) => n + 1, 0);

  const isGlobalFeed = isGuest || followingIds.size === 0 || userForcedGlobal || isRecommendingGlobal;
  const [feedError, setFeedError] = useState<string | null>(null);

  // Load social feed (global for guests, personal for signed-in users)
  useEffect(() => {
    if (authLoading) return;

    let mounted = true;

    const loadFeed = async () => {
      setFeedLoading(true);
      setFeedError(null);

      try {
        let fIds: string[] = [];

        if (!isGuest && user) {
          // Get IDs of users we follow
          const { data: followData, error: followError } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);

          if (followError) {
            console.error("[feed] Failed to load follows:", followError.message || followError);
          }

          fIds = followData?.map((f) => f.following_id) ?? [];

          if (mounted) {
            setFollowingIds(new Set(fIds));
          }
        }

        let sessionData;
        let didFallbackToGlobal = false;

        // Only fetch 'public' sessions to prevent friends-only leaks
        const useGlobal = fIds.length === 0 || userForcedGlobal;

        if (useGlobal) {
          const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
          if (error) {
            console.error("[feed] Global fetch failed:", error.message || error);
            if (mounted) setFeedError("Failed to load feed. Try again.");
          }
          sessionData = data;
        } else {
          const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .in("user_id", fIds)
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
          if (error) {
            console.error("[feed] Following fetch failed:", error.message || error);
            if (mounted) setFeedError("Failed to load feed. Try again.");
          }
          sessionData = data;
          
          // Fallback to global if following feed is empty
          if (!sessionData || sessionData.length === 0) {
            const { data: globalData, error: globalError } = await supabase
              .from("sessions")
              .select("*")
              .eq("visibility", "public")
              .order("started_at", { ascending: false })
              .limit(50);
              
            if (!globalError && globalData && globalData.length > 0) {
              sessionData = globalData;
              didFallbackToGlobal = true;
            }
          }
        }

        if (mounted) {
          setIsRecommendingGlobal(didFallbackToGlobal);
        }

        if (!sessionData || sessionData.length === 0 || !mounted) {
          if (mounted) {
            setFeedItems([]);
            setFeedLoading(false);
          }
          return;
        }

        // Fetch profiles for those users
        const userIds = Array.from(new Set(sessionData.map((s: CloudSession) => s.user_id)));
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        const profileMap = new Map(
          (profileData as Profile[] | null)?.map((p) => [p.id, p]) ?? []
        );

        if (mounted) {
          setFeedItems(
            sessionData.map((s) => ({
              session: cloudToLocal(s as CloudSession),
              profile: profileMap.get(s.user_id),
            }))
          );
          setFeedLoading(false);
        }
      } catch (err: any) {
        console.error("[feed] Unexpected error:", err.message || err);
        if (mounted) {
          setFeedError("Something went wrong loading the feed.");
          setFeedLoading(false);
        }
      }
    };

    loadFeed();
    return () => { mounted = false; };
  }, [user, isGuest, authLoading, userForcedGlobal, feedRefetch]);

  const toggleFollow = async (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || loadingFollow.has(targetId)) return;
    setLoadingFollow((prev) => new Set(prev).add(targetId));

    const isFollowing = followingIds.has(targetId);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
        
      if (error) {
        console.error("Failed to unfollow:", error.message || error);
        toast.error("Failed to unfollow user.");
      } else {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        // Trigger feed refetch after follow change
        triggerFeedRefetch();
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetId,
      });
      
      if (error) {
        if (error.code === '23505') {
          setFollowingIds((prev) => new Set(prev).add(targetId));
        } else {
          console.error("Failed to follow:", error.message || error);
          toast.error("Failed to follow user.");
        }
      } else {
        setFollowingIds((prev) => new Set(prev).add(targetId));
        // Trigger feed refetch after follow change
        triggerFeedRefetch();
      }
    }

    setLoadingFollow((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
  };

  if (authLoading || (feedLoading && feedItems.length === 0)) {
    return (
      <div className="mx-auto max-w-[720px] px-4 pb-28 pt-10">
        <header className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </header>
        <div className="columns-1 sm:columns-2 gap-4 space-y-4 sm:space-y-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card rounded-cozy p-5 break-inside-avoid mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feedError && feedItems.length === 0) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <p className="text-brown">{feedError}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => triggerFeedRefetch()}>
          Try again
        </button>
      </div>
    );
  }

  // Determine what to show
  const showSocialFeed = feedItems.length > 0;

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-28 pt-10">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-3xl text-brown">
            {isGuest ? "Global Discovery" : isRecommendingGlobal ? "Recommended Content" : isGlobalFeed ? "Global Discovery" : "Feed"}
          </h1>
          <p className="mt-1 text-sm text-brown-muted">
            {isGuest
              ? "Explore what others are working on. Sign in to follow users and build your feed."
              : isRecommendingGlobal
                ? "The people you follow haven't posted recently. Here are some recent public sessions to discover."
                : isGlobalFeed
                  ? "Recent public sessions. Follow users to build your personal feed."
                  : "Sessions from people you follow."}
          </p>
        </div>
        
        {/* Toggle between Following and Global if user has following */}
        {!isGuest && followingIds.size > 0 && (
          <button
            onClick={() => {
              setUserForcedGlobal(prev => !prev);
              setFeedItems([]);
              setFeedLoading(true);
            }}
            className="text-xs font-medium text-terracotta hover:text-terracotta-hover transition-colors"
          >
            {userForcedGlobal ? "View Following" : "View Global"}
          </button>
        )}
      </header>

      {/* Guest sign-in prompt */}
      {isGuest && (
        <div className="card mb-6 flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-dark">
            <Users className="h-5 w-5 text-brown" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-brown">
              See what others are working on
            </p>
            <p className="text-xs text-brown-muted">
              Sign in and follow users to build your feed.
            </p>
          </div>
          <button
            onClick={() => router.push("/auth")}
            className="btn-primary text-xs px-4 py-2"
          >
            Sign In
          </button>
        </div>
      )}

      {showSocialFeed && (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4 sm:space-y-0">
          {feedItems.map(({ session, profile }) => (
            <FeedItemCard
              key={session.id}
              session={session}
              profile={profile}
              currentUser={user}
              followingIds={followingIds}
              loadingFollow={loadingFollow}
              toggleFollow={toggleFollow}
            />
          ))}
        </div>
      )}

      {/* Empty state — no sessions found at all */}
      {!feedLoading && feedItems.length === 0 && (
        <div className="card flex min-h-[200px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
          <p className="font-medium text-brown">
            {isGuest ? "Nothing to show yet" : "Your feed is empty"}
          </p>
          <p className="mt-2 max-w-sm text-sm text-brown-muted">
            {isGuest
              ? "No public sessions have been shared yet. Sign in and start a session to be the first!"
              : followingIds.size > 0 
                ? "The people you follow haven't posted any public sessions yet."
                : "No public sessions found. Follow other users or start sharing your own sessions!"}
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => router.push("/")}
              className="btn-primary text-xs"
            >
              Start Session
            </button>
            {!isGuest && (
              <button
                onClick={() => router.push("/search")}
                className="btn-secondary text-xs"
              >
                Find People
              </button>
            )}
            {isGuest && (
              <button
                onClick={() => router.push("/auth")}
                className="btn-secondary text-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
