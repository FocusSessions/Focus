"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import type { Profile } from "@/types/supabase";
import { Search as SearchIcon, Loader2, UserPlus, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";

export default function SearchPage() {
  const { user, isGuest } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loadingFollows, setLoadingFollows] = useState<Set<string>>(new Set());

  // Load who the current user follows
  useEffect(() => {
    if (!user) return;
    const loadFollowing = async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (data) {
        setFollowingIds(new Set(data.map((f) => f.following_id)));
      }
    };
    loadFollowing();
  }, [user]);

  useEffect(() => {
    let active = true;

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timeoutId = setTimeout(async () => {
      // Escape special Postgres ilike characters:
      // 1. Escape backslashes first (\ → \\)
      // 2. Then escape % and _ with backslash
      // 3. Strip other problematic chars
      const sanitizedQuery = query
        .replace(/\\/g, "\\\\")         // escape backslashes first
        .replace(/%/g, "\\%")           // escape % for ilike
        .replace(/_/g, "\\_")           // escape _ for ilike
        .replace(/[,.()\"']/g, "")      // strip punctuation
        .trim();

      if (!sanitizedQuery) {
        if (active) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${sanitizedQuery}%,display_name.ilike.%${sanitizedQuery}%`)
          .limit(20);

        if (!active) return;

        if (error) {
          console.error("[Search] Supabase error:", error.message || error);
          toast.error("Database error: " + error.message);
          setResults([]);
        } else {
          setResults((data as Profile[]) || []);
        }
      } catch (err: any) {
        console.error("[Search] Fetch error:", err.message || err);
        if (active) {
          toast.error("Network error: " + (err.message || "Failed to fetch"));
          setResults([]);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const toggleFollow = useCallback(
    async (targetId: string) => {
      if (!user || loadingFollows.has(targetId) || user.id === targetId) return;
      setLoadingFollows((prev) => new Set(prev).add(targetId));

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
        }
      }

      setLoadingFollows((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    },
    [user, followingIds, loadingFollows]
  );

  return (
    <div className="mx-auto max-w-[720px] px-4 pb-36 pt-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-brown">Search</h1>
        <p className="mt-1 text-sm text-brown-muted">
          Find and follow other focused minds.
        </p>
      </header>

      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
        <input
          type="text"
          placeholder="Search by username or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-11 pr-10"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brown-muted" />
        )}
      </div>

      {/* Guest nudge */}
      {isGuest && (
        <div className="card mb-6 flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-dark">
            <Users className="h-5 w-5 text-brown" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-brown">Sign in to follow users</p>
            <p className="text-xs text-brown-muted">
              You can browse profiles, but need an account to follow.
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

      {/* Results */}
      {query.trim() && !searching && results.length === 0 && (
        <div className="card flex min-h-[160px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
          <p className="font-medium text-brown">No users found</p>
          <p className="mt-1 text-sm text-brown-muted">
            Try a different username or name.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((profile) => {
            const isSelf = user?.id === profile.id;
            const isFollowing = followingIds.has(profile.id);
            const safeUsername = profile.username || `user_${profile.id.slice(0, 8)}`;
            const safeDisplayName = profile.display_name || profile.username || "Unknown";
            const initial = safeDisplayName[0]?.toUpperCase() || "?";

            return (
              <article
                key={profile.id}
                className="card flex items-center gap-4 p-4 transition-all duration-cozy hover:shadow-md cursor-pointer"
                onClick={() => router.push(`/user/${safeUsername}`)}
              >
                {/* Avatar */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-lg font-bold text-white font-serif leading-[0]">
                  {initial}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-brown">
                      {safeDisplayName}
                    </span>
                  </div>
                  <p className="text-xs text-brown-muted">@{safeUsername}</p>
                  {profile.bio && (
                    <p className="mt-0.5 truncate text-xs text-brown-muted">{profile.bio}</p>
                  )}
                </div>

                {/* Follow button */}
                {!isSelf && !isGuest && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(profile.id);
                    }}
                    disabled={loadingFollows.has(profile.id)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-cozy ${
                      isFollowing
                        ? "border border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-terracotta"
                        : "bg-terracotta text-white hover:bg-terracotta-hover"
                    }`}
                  >
                    {loadingFollows.has(profile.id) ? (
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
                )}

                {isSelf && (
                  <span className="rounded-full border border-border bg-cream px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-brown-muted">
                    You
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!query.trim() && (
        <div className="card flex min-h-[200px] flex-col items-center justify-center rounded-cozy border-dashed p-10 text-center">
          <SearchIcon className="mb-3 h-8 w-8 text-brown-muted/40" />
          <p className="font-medium text-brown">Discover focused people</p>
          <p className="mt-1 max-w-sm text-sm text-brown-muted">
            Search by username or display name to find and follow other users.
          </p>
        </div>
      )}
    </div>
  );
}
