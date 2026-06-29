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
      className={`card rounded-xl p-5 mb-4 transition-all duration-300 hover:bg-brown/[0.02] border border-border/50 ${session.description ? 'cursor-pointer' : ''}`}
      onClick={() => session.description && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (currentUser?.id === profile.id) {
                router.push('/profile');
              } else {
                router.push(`/user/${profile.username}`);
              }
            }}
            className="flex-shrink-0 group pt-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-base font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              {(profile.display_name || profile.username)[0]?.toUpperCase()}
            </div>
          </button>
        ) : (
           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-dark text-base font-bold text-brown shadow-sm shrink-0 pt-1">
             ?
           </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {profile ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentUser?.id === profile.id) {
                    router.push('/profile');
                  } else {
                    router.push(`/user/${profile.username}`);
                  }
                }}
                className="group flex items-baseline gap-x-1.5 text-left"
              >
                <span className="truncate text-[15px] font-bold text-brown group-hover:text-terracotta transition-colors">
                  {profile.display_name || profile.username}
                </span>
                <span className="truncate text-[13px] text-brown-muted font-medium">
                  @{profile.username}
                </span>
              </button>
            ) : (
              <span className="truncate text-[15px] font-bold text-brown">
                Unknown User
              </span>
            )}
          </div>

          <h2 className="text-[17px] font-bold text-brown leading-snug mb-1">
            {session.title || "Focus Session"}
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-brown-muted font-medium">
            <span className="capitalize">{session.category || "other"}</span>
            <span className="opacity-60">•</span>
            <span>
              {formatTimeRange(session.startedAt, session.endedAt)} ({dayLabel(getLogicalDateKey(session.startedAt, session.timezoneOffset))})
            </span>
          </div>
          
          {session.description && (
            <div className={`mt-3 text-[14px] leading-relaxed text-brown/90 ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {session.description}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-start gap-6 ml-4">
          <div className="flex flex-col items-end pt-1">
            <span className="text-sage font-bold text-[13px]">
              {formatDurationShort(session.durationMs)}
            </span>
          </div>

          {profile && currentUser && currentUser.id !== profile.id && (
            <button
              onClick={(e) => toggleFollow(profile.id, e)}
              disabled={loadingFollow.has(profile.id)}
              className={`mt-0.5 flex items-center justify-center rounded border px-4 py-1.5 text-[13px] font-medium transition-colors duration-200 disabled:opacity-50 ${
                followingIds.has(profile.id)
                  ? "border-border bg-transparent text-brown-muted hover:border-terracotta/40 hover:text-terracotta"
                  : "border-terracotta/40 bg-transparent text-terracotta hover:bg-terracotta/5"
              }`}
            >
              {loadingFollow.has(profile.id) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : followingIds.has(profile.id) ? (
                "Following"
              ) : (
                "Follow"
              )}
            </button>
          )}
        </div>
      </div>
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

  const [feedError, setFeedError] = useState<string | null>(null);
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
          let query = supabase
            .from("sessions")
            .select("*")
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
            
          if (selectedCategory !== "all") {
            query = query.eq("category", selectedCategory);
          }
            
          const { data, error } = await query;
            
          if (error) {
            console.error("[feed] Global fetch failed:", error.message || error);
            if (mounted) setFeedError("Failed to load feed. Try again.");
          }
          sessionData = data;
        } else {
          let query = supabase
            .from("sessions")
            .select("*")
            .in("user_id", fIds)
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
            
          if (selectedCategory !== "all") {
            query = query.eq("category", selectedCategory);
          }
            
          const { data, error } = await query;
            
          if (error) {
            console.error("[feed] Following fetch failed:", error.message || error);
            if (mounted) setFeedError("Failed to load feed. Try again.");
          }
          sessionData = data;
          
          // Fallback to global if following feed is empty
          if (!sessionData || sessionData.length === 0) {
            let globalQuery = supabase
              .from("sessions")
              .select("*")
              .eq("visibility", "public")
              .order("started_at", { ascending: false })
              .limit(50);
              
            if (selectedCategory !== "all") {
              globalQuery = globalQuery.eq("category", selectedCategory);
            }
              
            const { data: globalData, error: globalError } = await globalQuery;
              
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
  }, [user, isGuest, authLoading, userForcedGlobal, feedRefetch, selectedCategory]);

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
      <div className="mx-auto max-w-[1000px] px-4 pb-28 pt-10">
        <header className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </header>
        <div className="flex flex-col space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card rounded-xl p-5 mb-4 border border-border/50">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-3 w-36 mb-4" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
                <div className="flex-shrink-0 flex items-start gap-6 ml-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
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
    <div className="mx-auto max-w-[1000px] px-4 pb-28 pt-10">
      <header className="mb-6 flex flex-col gap-6">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] font-bold text-brown">
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
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search sessions or users..." 
                className="pl-9 pr-10 py-1.5 bg-surface border border-border/50 rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-border transition-all"
                readOnly
                onClick={() => router.push('/search')}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50">
                <kbd className="font-sans text-[10px] bg-background border border-border px-1.5 rounded">⌘K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedCategory("all")}
              className={`text-[13px] font-medium transition-colors ${selectedCategory === "all" ? "text-terracotta border border-terracotta/30 bg-terracotta/5 rounded-full px-4 py-1" : "text-brown-muted hover:text-brown"}`}
            >
              All
            </button>
            <button 
              onClick={() => setSelectedCategory("coding")}
              className={`text-[13px] font-medium transition-colors ${selectedCategory === "coding" ? "text-terracotta border border-terracotta/30 bg-terracotta/5 rounded-full px-4 py-1" : "text-brown-muted hover:text-brown"}`}
            >
              Coding
            </button>
            <button 
              onClick={() => setSelectedCategory("gaming")}
              className={`text-[13px] font-medium transition-colors ${selectedCategory === "gaming" ? "text-terracotta border border-terracotta/30 bg-terracotta/5 rounded-full px-4 py-1" : "text-brown-muted hover:text-brown"}`}
            >
              Gaming
            </button>
            <button 
              onClick={() => setSelectedCategory("studying")}
              className={`text-[13px] font-medium transition-colors ${selectedCategory === "studying" ? "text-terracotta border border-terracotta/30 bg-terracotta/5 rounded-full px-4 py-1" : "text-brown-muted hover:text-brown"}`}
            >
              Studying
            </button>
            <button 
              onClick={() => setSelectedCategory("other")}
              className={`text-[13px] font-medium transition-colors ${selectedCategory === "other" ? "text-terracotta border border-terracotta/30 bg-terracotta/5 rounded-full px-4 py-1" : "text-brown-muted hover:text-brown"}`}
            >
              Other
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {!isGuest && followingIds.size > 0 && (
              <button
                onClick={() => {
                  setUserForcedGlobal(prev => !prev);
                  setFeedItems([]);
                  setFeedLoading(true);
                }}
                className="text-[13px] font-medium text-terracotta hover:text-terracotta-hover transition-colors"
              >
                {userForcedGlobal ? "View Following" : "View Global"}
              </button>
            )}
            
            <button className="flex items-center gap-1.5 text-[13px] font-medium text-brown-muted hover:text-brown transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Latest
              <svg className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
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
        <div className="flex flex-col space-y-4">
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
