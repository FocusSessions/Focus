"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/supabase";
import { X, Loader2 } from "lucide-react";
import Link from "next/link";
import { determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";

interface FollowListModalProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

export function FollowListModal({ userId, type, onClose }: FollowListModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let ids: string[] = [];
        if (type === "followers") {
          const { data, error: fetchErr } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
          if (fetchErr) throw fetchErr;
          ids = data?.map(d => d.follower_id) || [];
        } else {
          const { data, error: fetchErr } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
          if (fetchErr) throw fetchErr;
          ids = data?.map(d => d.following_id) || [];
        }

        if (ids.length > 0) {
          const { data: profileData, error: profileErr } = await supabase.from("profiles").select("*").in("id", ids);
          if (profileErr) throw profileErr;
          if (mounted && profileData) {
            setProfiles(profileData);
          }
        } else if (mounted) {
          setProfiles([]);
        }
      } catch (err) {
        console.error("[FollowListModal] Failed to load:", (err as any)?.message || err);
        if (mounted) setError("Failed to load list. Please try again.");
      }
      
      if (mounted) setLoading(false);
    };

    fetchUsers();
    return () => { mounted = false; };
  }, [userId, type, retryCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-cream dark:bg-[#121110] border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-serif text-lg font-medium text-brown capitalize">{type}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-1.5 text-brown-muted hover:bg-surface hover:text-brown transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brown-muted" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-terracotta">{error}</p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="mt-2 text-xs text-brown-muted hover:text-brown underline"
              >
                Try again
              </button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-sm text-brown-muted">
              No {type} found.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => {
                const displayName = profile.display_name || profile.username;
                const initial = displayName[0]?.toUpperCase() || "?";
                
                return (
                  <Link 
                    key={profile.id} 
                    href={`/user/${profile.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-[#5a7a5f] text-sm font-bold text-white font-serif">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brown truncate">{displayName}</p>
                      <p className="text-xs text-brown-muted truncate">@{profile.username}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
