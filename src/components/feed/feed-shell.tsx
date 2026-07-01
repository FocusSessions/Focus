"use client";

import { useEffect, useState, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import type { FocusSessionActivity } from "@/types";
import type { Profile, CloudSession } from "@/types/supabase";
import { formatDurationShort, formatTimeRange, dayLabel, getLogicalDateKey } from "@/lib/time";
import { Users, Loader2, Check, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface FeedItem {
  session: FocusSessionActivity;
  profile?: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
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
  likes = [],
  comments = [],
}: {
  session: FocusSessionActivity;
  profile?: Profile;
  currentUser: any;
  followingIds: Set<string>;
  loadingFollow: Set<string>;
  toggleFollow: (id: string, e: React.MouseEvent) => void;
  likes: { user_id: string }[];
  comments: { id: string }[];
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const [isLiked, setIsLiked] = useState(() => likes.some(l => l.user_id === currentUser?.id));
  const [likeCount, setLikeCount] = useState(likes.length);
  const [likeLoading, setLikeLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments.length);
  const [comment, setComment] = useState("");
  const [loadedComments, setLoadedComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      router.push('/auth');
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    if (newLikedState) {
      const { error } = await supabase.from('likes').insert({ session_id: session.id, user_id: currentUser.id });
      if (error && error.code !== '23505') { // Ignore unique violation if already liked
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        toast.error("Failed to like");
      }
    } else {
      const { error } = await supabase.from('likes').delete().match({ session_id: session.id, user_id: currentUser.id });
      if (error) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        toast.error("Failed to unlike");
      }
    }
    setLikeLoading(false);
  };

  const loadComments = async () => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, display_name)')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setLoadedComments(data);
    }
    setCommentsLoading(false);
  };

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showComments && loadedComments.length === 0 && commentCount > 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push('/auth');
      return;
    }
    if (!comment.trim()) return;

    const newCommentText = comment.trim();
    setComment("");
    
    // Optimistic UI update
    const optimisticComment = {
      id: "temp-" + Date.now(),
      session_id: session.id,
      user_id: currentUser.id,
      content: newCommentText,
      created_at: new Date().toISOString(),
      profiles: {
        username: currentUser.username,
        display_name: currentUser.display_name
      }
    };
    setLoadedComments(prev => [...prev, optimisticComment]);
    setCommentCount(prev => prev + 1);

    const { data, error } = await supabase.from('comments').insert({
      session_id: session.id,
      user_id: currentUser.id,
      content: newCommentText
    }).select('*, profiles(username, display_name)').single();

    if (error) {
      toast.error("Failed to post comment");
      setLoadedComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      setCommentCount(prev => Math.max(0, prev - 1));
    } else if (data) {
      setLoadedComments(prev => prev.map(c => c.id === optimisticComment.id ? data : c));
    }
  };

  return (
    <article
      className="group relative overflow-hidden rounded-[16px] mb-5 bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:border-black/10 transition-all duration-300"
    >
      <div className="p-5 sm:p-6">
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
              className="flex-shrink-0 relative outline-none"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-lg font-bold text-white shadow-sm transition-transform duration-300 hover:scale-105">
                {(profile.display_name || profile.username)[0]?.toUpperCase()}
              </div>
            </button>
          ) : (
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-dark text-lg font-bold text-brown shadow-sm shrink-0">
               ?
             </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
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
                      className="group/name flex flex-wrap items-baseline gap-x-1.5 text-left outline-none"
                    >
                      <span className="truncate max-w-[120px] sm:max-w-[200px] text-[15px] font-bold text-brown group-hover/name:text-terracotta transition-colors">
                        {profile.display_name || profile.username}
                      </span>
                      <span className="truncate max-w-[100px] sm:max-w-[150px] text-[13px] text-brown-muted font-medium">
                        @{profile.username}
                      </span>
                    </button>
                  ) : (
                    <span className="truncate text-[15px] font-bold text-brown">
                      Unknown User
                    </span>
                  )}
                  <span className="text-brown-muted/40 text-[10px] hidden sm:inline">•</span>
                  <span className="text-[12px] font-medium text-brown-muted/70 whitespace-nowrap">
                    {dayLabel(getLogicalDateKey(session.startedAt, session.timezoneOffset))}
                  </span>
                </div>
                
                <h2 className="text-[17px] font-bold text-brown leading-snug mb-2 group-hover:text-terracotta transition-colors">
                  {session.title || "Focus Session"}
                </h2>
                
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide uppercase text-brown-muted/80">
                  <span className="bg-sand-dark px-2 py-0.5 rounded text-brown/70">{session.category || "other"}</span>
                  <span>{formatTimeRange(session.startedAt, session.endedAt)}</span>
                  <span className="text-brown-muted/40 text-[10px] hidden sm:inline">•</span>
                  <span className="text-sage bg-sage/10 px-2 py-0.5 rounded-full border border-sage/20 shadow-sm">{formatDurationShort(session.durationMs)}</span>
                </div>
              </div>

              {/* Actions & Follow */}
              {profile && currentUser && currentUser.id !== profile.id && (
                <div className="flex items-center gap-2.5 shrink-0 mt-1 sm:mt-0">
                  <button
                    onClick={(e) => toggleFollow(profile.id, e)}
                    disabled={loadingFollow.has(profile.id)}
                    className={`flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 disabled:opacity-50 ${
                      followingIds.has(profile.id)
                        ? "border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-terracotta hover:bg-terracotta/5"
                        : "border-terracotta bg-terracotta text-white hover:bg-terracotta-hover shadow-sm hover:shadow"
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
                </div>
              )}
            </div>
            
            {session.description && (
              <div 
                className={`mt-3 ${session.description.length > 100 ? 'cursor-pointer' : ''}`}
                onClick={() => session.description!.length > 100 && setIsExpanded(!isExpanded)}
              >
                <div className={`text-[14px] leading-relaxed text-brown/80 relative transition-all duration-300 ${!isExpanded && session.description.length > 100 ? 'line-clamp-2' : ''}`}>
                  {session.description}
                  {!isExpanded && session.description.length > 100 && (
                    <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white dark:from-[#1A1A1A] dark:via-[#1A1A1A] to-transparent w-24 h-6 flex justify-end items-end pl-8">
                      <span className="text-terracotta text-xs font-semibold hover:underline bg-white dark:bg-[#1A1A1A] pl-1">more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interaction Bar */}
            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors outline-none ${
                    isLiked ? "text-terracotta" : "text-brown-muted hover:text-brown"
                  }`}
                >
                  <svg className={`w-4 h-4 ${isLiked ? "fill-terracotta" : "fill-transparent"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{likeCount}</span>
                </button>

                <button 
                  onClick={toggleComments}
                  className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors outline-none ${
                    showComments || commentCount > 0 ? "text-sage" : "text-brown-muted hover:text-brown"
                  }`}
                >
                  <svg className={`w-4 h-4 ${showComments || commentCount > 0 ? "fill-sage/20" : "fill-transparent"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{commentCount}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-sand-dark/30 dark:bg-black/10 ${showComments ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 border-t border-black/5">
          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-brown-muted" />
            </div>
          ) : loadedComments.length > 0 ? (
            <div className="space-y-4 mb-5 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
              {loadedComments.map((c) => (
                <div key={c.id} className="flex items-start gap-3 text-sm">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-terracotta/80 to-terracotta flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(c.profiles?.display_name || c.profiles?.username || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="bg-white dark:bg-[#222] px-3 py-2.5 rounded-[14px] rounded-tl-sm border border-black/5 shadow-sm">
                    <span className="font-bold text-brown block text-[11px] mb-0.5">{c.profiles?.display_name || c.profiles?.username || "Unknown"}</span>
                    <span className="text-brown/90 text-[13px] leading-relaxed block">{c.content}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          
          <form onSubmit={handleCommentSubmit} className="flex gap-3 relative">
            <div className="h-9 w-9 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentUser?.display_name?.[0]?.toUpperCase() || currentUser?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <input 
              type="text" 
              placeholder={currentUser ? "Add a comment..." : "Sign in to comment..."}
              disabled={!currentUser}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 bg-white dark:bg-[#222] border border-border/50 rounded-full pl-4 pr-10 text-[13px] focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition-all shadow-sm"
            />
            <button 
              type="submit"
              disabled={!comment.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-terracotta hover:bg-terracotta/10 rounded-full disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
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
  const [userForcedGlobal, setUserForcedGlobal] = useState(true);
  const [isRecommendingGlobal, setIsRecommendingGlobal] = useState(false);
  const [feedRefetch, triggerFeedRefetch] = useReducer((n: number) => n + 1, 0);

  const isGlobalFeed = isGuest || followingIds.size === 0 || userForcedGlobal || isRecommendingGlobal;
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
            .select("*, likes(user_id), comments(id)")
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
            
          if (selectedCategory !== "all") {
            if (selectedCategory === "other") {
              query = query.or('category.eq.other,category.is.null');
            } else {
              query = query.eq("category", selectedCategory);
            }
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
            .select("*, likes(user_id), comments(id)")
            .in("user_id", fIds)
            .eq("visibility", "public")
            .order("started_at", { ascending: false })
            .limit(50);
            
          if (selectedCategory !== "all") {
            if (selectedCategory === "other") {
              query = query.or('category.eq.other,category.is.null');
            } else {
              query = query.eq("category", selectedCategory);
            }
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
              .select("*, likes(user_id), comments(id)")
              .eq("visibility", "public")
              .order("started_at", { ascending: false })
              .limit(50);
              
            if (selectedCategory !== "all") {
              if (selectedCategory === "other") {
                globalQuery = globalQuery.or('category.eq.other,category.is.null');
              } else {
                globalQuery = globalQuery.eq("category", selectedCategory);
              }
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
            sessionData.map((s: any) => ({
              session: cloudToLocal(s),
              profile: profileMap.get(s.user_id),
              likes: s.likes || [],
              comments: s.comments || []
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
      <div className="mx-auto max-w-[1000px] px-4 md:px-8 pb-24 md:pb-10 pt-6 md:pt-10">
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
    <div className="mx-auto max-w-[1000px] px-4 md:px-8 pb-24 md:pb-10 pt-6 md:pt-10">
      <header className="mb-6 flex flex-col gap-6">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
          <div>
            <h1 className="font-serif text-[28px] md:text-4xl font-bold text-brown">
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
          
          <div className="hidden md:flex items-center gap-4">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4 mt-2">
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex flex-nowrap w-max p-1.5 gap-1.5 bg-brown/[0.03] shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] backdrop-blur-xl rounded-[22px] border border-border/60">
            {[
              { id: "all", label: "All" },
              { id: "coding", label: "Coding" },
              { id: "gaming", label: "Gaming" },
              { id: "studying", label: "Studying" },
              { id: "other", label: "Other" },
            ].map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`relative px-5 py-2 text-[13px] font-bold rounded-[18px] transition-colors duration-300 outline-none group ${
                    isActive
                      ? "text-terracotta"
                      : "text-brown/60 hover:text-brown"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryFeed"
                      className="absolute inset-0 bg-terracotta/[0.08] rounded-[18px] border border-terracotta/20 shadow-[0_2px_8px_rgba(200,90,70,0.08)]"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-[18px] bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                  <span className="relative z-10 tracking-wide">{category.label}</span>
                </button>
              );
            })}
            </div>
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
            
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-brown-muted">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Latest
            </div>
          </div>
        </div>
      </header>

      {/* Guest sign-in prompt */}
      {isGuest && (
        <div className="card mb-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-5 sm:p-6 animate-slide-up">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-terracotta/10">
            <Users className="h-6 w-6 text-terracotta" strokeWidth={1.5} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-serif text-lg font-medium text-brown mb-1">
              See what others are working on
            </h3>
            <p className="text-sm text-brown-muted">
              Sign in and follow users to build your feed.
            </p>
          </div>
          <button
            onClick={() => router.push("/auth")}
            className="btn-primary w-full sm:w-auto"
          >
            Sign In
          </button>
        </div>
      )}

      {showSocialFeed && (
        <div className="flex flex-col space-y-4">
          {feedItems.map(({ session, profile, likes, comments }) => (
            <FeedItemCard
              key={session.id}
              session={session}
              profile={profile}
              currentUser={user}
              followingIds={followingIds}
              loadingFollow={loadingFollow}
              toggleFollow={toggleFollow}
              likes={likes}
              comments={comments}
            />
          ))}
        </div>
      )}

      {/* Empty state — no sessions found at all */}
      {!feedLoading && feedItems.length === 0 && (
        <div className="card flex min-h-[300px] flex-col items-center justify-center p-8 text-center animate-zoom-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream mb-4">
            <Newspaper className="h-8 w-8 text-brown-muted" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-serif font-medium text-brown mb-2">
            {isGuest ? "Nothing to show yet" : "Your feed is empty"}
          </h2>
          <p className="max-w-sm text-sm text-brown-muted leading-relaxed mb-6">
            {isGuest
              ? "No public sessions have been shared yet. Sign in and start a session to be the first!"
              : followingIds.size > 0 
                ? "The people you follow haven't posted any public sessions yet."
                : "No public sessions found. Follow other users or start sharing your own sessions!"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              Start Session
            </button>
            {!isGuest && (
              <button
                onClick={() => router.push("/search")}
                className="btn-secondary"
              >
                Find People
              </button>
            )}
            {isGuest && (
              <button
                onClick={() => router.push("/auth")}
                className="btn-secondary"
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
