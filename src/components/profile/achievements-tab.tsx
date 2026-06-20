"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { evaluateAchievements, type Achievement } from "@/lib/achievements";
import type { Activity } from "@/types";
import { Lock, ChevronLeft, ChevronRight } from "lucide-react";
import * as Icons from "lucide-react";
import { RANKS, determineRank } from "@/lib/ranks";
import { RankBadgeIcon } from "@/components/profile/rank-icons";

interface AchievementsTabProps {
  activities: Activity[];
  joinedAt?: number;
  productivityScore?: number;
}

const CATEGORY_ORDER = [
  "Onboarding",
  "Rhythms",
  "Volume",
  "Depth",
  "Specialization",
  "Patterns",
  "Stats",
  "Social",
  "Elite",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  Onboarding: "Getting Started",
  Rhythms: "Rhythms & Consistency",
  Volume: "Volume & Endurance",
  Depth: "Depth & Intensity",
  Specialization: "Specialization & Identity",
  Patterns: "Temporal Patterns",
  Stats: "Statistical Excellence",
  Social: "Social & Craft Integrity",
  Elite: "Elite Masteries",
};

function BadgeRenderer({ achievement }: { achievement: Achievement }) {
  const isUnlocked = achievement.unlockedAt !== null;
  // @ts-ignore
  const IconComponent = Icons[achievement.iconName] || Icons.Star;

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center flex-shrink-0 w-28 group cursor-default" title={achievement.description}>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface-dark border-4 border-transparent shadow-inner opacity-60 transition-transform duration-300 group-hover:scale-105">
          <div className="absolute inset-0 rounded-full bg-black/10 mix-blend-multiply"></div>
          <IconComponent className="h-10 w-10 text-brown-muted/40 stroke-[1.5]" />
        </div>
        <div className="mt-3 text-center">
          <h4 className="text-xs font-semibold text-brown-muted/70 tracking-tight leading-tight line-clamp-2 px-1">
            {achievement.name}
          </h4>
          <p className="mt-0.5 text-[10px] text-brown-muted/50 invisible">Locked</p>
        </div>
      </div>
    );
  }

  const borderColors = {
    bronze: "border-brown-muted/40 shadow-[0_0_15px_rgba(122,111,99,0.15)]",
    silver: "border-sage shadow-[0_0_15px_rgba(107,143,113,0.3)]",
    gold: "border-terracotta shadow-[0_0_20px_rgba(196,112,75,0.4)]",
  };

  const bgGradients = {
    bronze: "bg-gradient-to-br from-cream to-sand",
    silver: "bg-gradient-to-br from-[#e6efe7] to-[#d0e0d4]",
    gold: "bg-gradient-to-br from-[#fcf7f5] to-[#f2dfd8]",
  };

  const iconColors = {
    bronze: "text-brown-muted",
    silver: "text-[#4a6b50]",
    gold: "text-terracotta",
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0 w-28 group cursor-pointer" title={achievement.description}>
      <div
        className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(250,204,21,0.8)] ${borderColors[achievement.tier]} ${bgGradients[achievement.tier]}`}
      >
        {/* Inner subtle glow/sparkle simulation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/5 to-transparent mix-blend-overlay"></div>
        <IconComponent className={`h-10 w-10 stroke-[2] drop-shadow-sm ${iconColors[achievement.tier]}`} />
      </div>
      <div className="mt-3 text-center">
        <h4 className="text-xs font-semibold text-brown tracking-tight leading-tight line-clamp-2 px-1">
          {achievement.name}
        </h4>
        <p className="mt-0.5 text-[10px] text-sage font-medium tracking-wide">
          {new Date(achievement.unlockedAt!).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function CategorySection({ category, items }: { category: string; items: Achievement[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        setIsOverflowing(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [items, isExpanded]);

  const categoryUnlocked = items.filter((a) => a.unlockedAt !== null).length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brown">
            {CATEGORY_LABELS[category] || category}
          </h3>
          <span className="text-[11px] font-medium text-brown-muted/80">
            {categoryUnlocked} of {items.length} unlocked
          </span>
        </div>
        {(isOverflowing || isExpanded) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-sage hover:text-terracotta transition-colors"
          >
            {isExpanded ? "Show less" : "View all"}
          </button>
        )}
      </div>

      <div className="relative group/scroll">
        <div
          ref={scrollRef}
          className={`py-8 px-2 -my-8 scrollbar-hide ${isExpanded
              ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center"
              : "flex gap-4 overflow-x-auto snap-x"
            }`}
        >
          {items.map((achievement) => (
            <div key={achievement.id} className={isExpanded ? "" : "snap-start"}>
              <BadgeRenderer achievement={achievement} />
            </div>
          ))}
        </div>

        {!isExpanded && isOverflowing && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-sand to-transparent"></div>
        )}
      </div>
    </section>
  );
}

function RanksSection({ currentRank, productivityScore, items }: { currentRank: any; productivityScore: number; items: typeof RANKS }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        setIsOverflowing(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [items, isExpanded]);

  return (
    <section className="space-y-4 border-b border-border/40 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brown">Ranks</h3>
          <span className="text-[11px] font-medium text-brown-muted/80">
            Current Rank: {currentRank.name}
          </span>
        </div>
        {(isOverflowing || isExpanded) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-sage hover:text-terracotta transition-colors"
          >
            {isExpanded ? "Show less" : "View all"}
          </button>
        )}
      </div>

      <div className="relative group/scroll">
        <div
          ref={scrollRef}
          className={`py-8 px-2 -my-8 scrollbar-hide ${isExpanded
              ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center"
              : "flex gap-4 overflow-x-auto snap-x"
            }`}
        >
          {items.map((rank) => {
            const isCurrent = currentRank.id === rank.id;
            const hasAchieved = productivityScore >= rank.threshold;
            
            return (
              <div key={rank.id} className={`flex flex-col items-center flex-shrink-0 w-32 group ${isExpanded ? "" : "snap-start"}`}>
                <div className={`relative flex h-28 w-28 items-center justify-center rounded-full transition-all duration-500 ${isCurrent ? 'scale-110 shadow-[0_0_30px_rgba(212,175,55,0.2)]' : hasAchieved ? 'opacity-100 hover:scale-105' : 'opacity-40 grayscale'}`}>
                  <div className={`absolute inset-0 rounded-full ${isCurrent ? 'animate-pulse opacity-20' : 'opacity-0'}`} style={{ backgroundColor: rank.glow }}></div>
                  <RankBadgeIcon rankId={rank.id} className="w-24 h-24 relative z-10" />
                </div>
                <div className="mt-4 text-center">
                  <h4 className={`text-sm font-semibold tracking-tight ${isCurrent ? 'text-terracotta' : hasAchieved ? 'text-brown' : 'text-brown-muted/70'}`}>
                    {rank.name}
                  </h4>
                  {isCurrent && (
                    <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta uppercase tracking-wider">
                      Current Rank
                    </span>
                  )}
                  {!hasAchieved && (
                    <p className="mt-0.5 text-[10px] text-brown-muted/50 font-medium">
                      {rank.threshold} pts
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!isExpanded && isOverflowing && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-sand to-transparent"></div>
        )}
      </div>
    </section>
  );
}

export function AchievementsTab({ activities, joinedAt, productivityScore = 0 }: AchievementsTabProps) {
  const achievements = useMemo(() => evaluateAchievements(activities, joinedAt), [activities, joinedAt]);
  
  const { current: currentRank } = determineRank(productivityScore);

  const grouped = useMemo(() => {
    const map = new Map<string, Achievement[]>();
    for (const a of achievements) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [achievements]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-cozy space-y-10 py-4">
      <RanksSection currentRank={currentRank} productivityScore={productivityScore} items={RANKS} />

      {CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category);
        if (!items || items.length === 0) return null;
        return <CategorySection key={category} category={category} items={items} />;
      })}
    </div>
  );
}
