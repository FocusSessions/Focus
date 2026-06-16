"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFocus } from "@/context/focus-app";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import type { FocusSessionActivity } from "@/types";
import type { Profile, CloudSession } from "@/types/supabase";
import { formatDurationShort, formatTimeRange, dayLabel, getLogicalDateKey } from "@/lib/time";
import { Users, Loader2 } from "lucide-react";

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
  const [feedLoading, setFeedLoading] = useState(false);

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

      const followingIds = followData?.map((f) => f.following_id) ?? [];

      if (followingIds.length === 0) {
        if (mounted) {
          setFeedItems([]);
          setFeedLoading(false);
        }
        return;
      }

      // Fetch public sessions from followed users
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .in("user_id", followingIds)
        .eq("visibility", "public")
        .order("started_at", { ascending: false })
        .limit(50);

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

  if (loadState === "loading" || authLoading) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <p className="text-brown-muted">Loading feed…</p>
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
    <div className="mx-auto max-w-[720px] px-4 pb-36 pt-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-brown">Feed</h1>
        <p className="mt-1 text-sm text-brown-muted">
          {isGuest
            ? "Sessions you've shared. Sign in to see friends' activity."
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

      {/* Social feed (signed in) */}
      {!isGuest && feedLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brown-muted" />
        </div>
      )}

      {showSocialFeed && (
        <div className="space-y-4">
          {feedItems.map(({ session, profile }) => (
            <article key={session.id} className="card rounded-cozy p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* User attribution */}
                  {profile && (
                    <button
                      onClick={() => router.push(`/user/${profile.username}`)}
                      className="mb-2 flex items-center gap-2 group"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-[10px] font-bold text-white">
                        {(profile.display_name || profile.username)[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-brown group-hover:text-terracotta transition-colors">
                        {profile.display_name || profile.username}
                      </span>
                      <span className="text-[10px] text-brown-muted">
                        @{profile.username}
                      </span>
                    </button>
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
          <button
            onClick={() => router.push("/search")}
            className="btn-primary mt-4 text-xs"
          >
            Find People
          </button>
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
            </div>
          ) : (
            <div className="space-y-4">
              {localShared.map((session) => (
                <article key={session.id} className="card rounded-cozy p-5">
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
