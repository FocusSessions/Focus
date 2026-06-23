"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFocus } from "@/context/focus-app";
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

export function FeedShell() {
  const { activities, loadState, loadError, retryLoad } = useFocus();
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(!isGuest && !!user);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);
  const [isGlobalFeed, setIsGlobalFeed] = useState(false);

  // Local shared sessions (for guest mode)
  const localShared = useMemo(() => {
    return activities
      .filter(
        (a): a is FocusSessionActivity =>
          a.type === "focus_session" &&
          (a.visibility === "public" || a.visibility === "friends")
      )
      .sort((a, b) => b.startedAt - a.startedAt);
  }, [activities]);

  // Load social feed when signed in
  useEffect(() => {
    if (isGuest || !user || authLoading) return;

    let mounted = true;

    const loadFeed = async () => {
      setFeedLoading(true);

      // Get IDs of users we follow
      const { data: followData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const fIds = followData?.map((f) => f.following_id) ?? [];

      if (mounted) {
        setFollowingIds(new Set(fIds));
      }

      let sessionData;

      if (fIds.length === 0) {
        if (mounted) setIsGlobalFeed(true);
        // Fallback to Global Discovery Feed
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("visibility", "public")
          .order("started_at", { ascending: false })
          .limit(50);
        sessionData = data;
      } else {
        if (mounted) setIsGlobalFeed(false);
        // Fetch public and friends sessions from followed users
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .in("user_id", fIds)
          .in("visibility", ["public", "friends"])
          .order("started_at", { ascending: false })
          .limit(50);
        sessionData = data;
      }

      if (!sessionData || !mounted) {
        if (mounted) setFeedLoading(false);
        return;
      }

      // Fetch profiles for those users
      const userIds = Array.from(new Set(sessionData.map((s: any) => s.user_id)));
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
    };

    loadFeed();
    return () => { mounted = false; };
  }, [user, isGuest, authLoading]);

  const toggleFollow = async (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || loadingFollow) return;
    setLoadingFollow(targetId);

    const isFollowing = followingIds.has(targetId);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
        
      if (error) {
        console.error("Failed to unfollow:", error);
        toast.error("Failed to unfollow user.");
      } else {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
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
          console.error("Failed to follow:", error);
          toast.error("Failed to follow user.");
        }
      } else {
        setFollowingIds((prev) => new Set(prev).add(targetId));
      }
    }

    setLoadingFollow(null);
  };

  if (loadState === "loading" || authLoading || (feedLoading && feedItems.length === 0)) {
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

  // Determine what to show
  const showSocialFeed = !isGuest && feedItems.length > 0;

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-28 pt-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-brown">
          {isGlobalFeed ? "Global Discovery" : "Feed"}
        </h1>
        <p className="mt-1 text-sm text-brown-muted">
          {isGuest
            ? "Sessions you've shared. Sign in to see friends' activity."
            : isGlobalFeed
              ? "Recent public sessions. Follow users to build your personal feed."
              : "Sessions from people you follow."}
        </p>
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

      {/* Removed old feedLoading spinner since skeleton handles it */}

      {showSocialFeed && (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4 sm:space-y-0">
          {feedItems.map(({ session, profile }) => (
            <article key={session.id} className="card rounded-cozy p-5 break-inside-avoid mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* User attribution */}
                  {profile && (
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/user/${profile.username}`)}
                        className="flex items-center gap-2 group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-[12px] font-bold text-white">
                          {(profile.display_name || profile.username)[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-brown group-hover:text-terracotta transition-colors">
                          {profile.display_name || profile.username}
                        </span>
                        <span className="text-[10px] text-brown-muted">
                          @{profile.username}
                        </span>
                      </button>

                      {/* Follow Button */}
                      {user && user.id !== profile.id && (
                        <button
                          onClick={(e) => toggleFollow(profile.id, e)}
                          disabled={loadingFollow === profile.id}
                          className="group/follow relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                          title={followingIds.has(profile.id) ? "Unfollow" : "Follow"}
                        >
                          {loadingFollow === profile.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-brown-muted" />
                          ) : followingIds.has(profile.id) ? (
                            <Check className="h-4 w-4 text-sage animate-zoom-in drop-shadow-sm" />
                          ) : (
                            <Plus className="h-4 w-4 text-brown-muted/70 transition-all duration-300 group-hover/follow:scale-110 group-hover/follow:text-terracotta group-active/follow:rotate-90 group-active/follow:scale-75" />
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
            </article>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isGuest && !feedLoading && feedItems.length === 0 && (
        <div className="card flex min-h-[200px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
          <p className="font-medium text-brown">Your feed is empty</p>
          <p className="mt-2 max-w-sm text-sm text-brown-muted">
            Follow other users to see their public sessions here.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => router.push("/")}
              className="btn-primary text-xs"
            >
              Start Session
            </button>
            <button
              onClick={() => router.push("/search")}
              className="btn-secondary text-xs"
            >
              Find People
            </button>
          </div>
        </div>
      )}

      {/* Guest mode: show own shared sessions */}
      {isGuest && (
        <>
          {localShared.length === 0 ? (
            <div className="card flex min-h-[200px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
              <p className="font-medium text-brown">Nothing to show yet.</p>
              <p className="mt-2 max-w-sm text-sm text-brown-muted">
                Save a session with Friends or Public visibility and it will
                appear here.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => router.push("/")}
                  className="btn-primary text-xs"
                >
                  Start Session
                </button>
              </div>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 gap-4 space-y-4 sm:space-y-0">
              {localShared.map((session) => (
                <article key={session.id} className="card rounded-cozy p-5 break-inside-avoid mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
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
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
