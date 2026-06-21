import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { RankId } from "@/lib/ranks";
import { RANKS } from "@/lib/ranks";

interface RankBadgeIconProps {
  rankId: RankId;
  className?: string;
  /** Show an info tooltip on hover. Defaults to true. */
  showTooltip?: boolean;
}

export function RankBadgeIcon({
  rankId,
  className = "w-16 h-16",
  showTooltip = true,
}: RankBadgeIconProps) {
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowLeft, setArrowLeft] = useState<string>("50%");
  const badgeRef = useRef<HTMLDivElement>(null);

  const rank = RANKS.find((r) => r.id === rankId);

  // Position the tooltip using fixed coordinates so it escapes any
  // overflow:hidden parent (common in grid/scroll containers).
  const handleMouseEnter = () => {
    if (badgeRef.current && rank) {
      const rect = badgeRef.current.getBoundingClientRect();
      const tooltipHeight = 130;
      const showAbove = rect.top > tooltipHeight;
      const leftCenter = rect.left + rect.width / 2;
      const tooltipHalfWidth = 115;
      
      let left = leftCenter;
      let transform = "translateX(-50%)";
      let aLeft = "50%";

      if (leftCenter < tooltipHalfWidth + 16) {
        left = 16;
        transform = "translateX(0)";
        aLeft = `${leftCenter - 16}px`;
      } else if (leftCenter > window.innerWidth - tooltipHalfWidth - 16) {
        left = window.innerWidth - 16;
        transform = "translateX(-100%)";
        aLeft = `calc(100% - ${window.innerWidth - leftCenter - 16}px)`;
      }

      setArrowLeft(aLeft);

      if (showAbove) {
        setTooltipStyle({
          position: "fixed",
          bottom: window.innerHeight - rect.top + 8,
          left,
          transform,
          zIndex: 9999,
        });
      } else {
        setTooltipStyle({
          position: "fixed",
          top: rect.bottom + 8,
          left,
          transform,
          zIndex: 9999,
        });
      }
      setVisible(true);
    }
  };

  // Close tooltip if the component unmounts mid-hover
  useEffect(() => () => setVisible(false), []);

  const svg = <BadgeSvg rankId={rankId} className={className} />;

  if (!showTooltip || !rank) return svg;

  return (
    <div
      ref={badgeRef}
      className="relative inline-flex items-center justify-center cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {svg}

      {visible && typeof document !== "undefined" && createPortal(
        <div style={tooltipStyle} className="pointer-events-none">
          <div
            className="rounded-xl px-3.5 py-2.5 shadow-2xl min-w-[170px] max-w-[230px] border"
            style={{
              background: "#18181b",
              borderColor: rank.borderColor + "55",
            }}
          >
            {/* Rank name */}
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: rank.accentColor }}
            >
              {rank.name}
            </p>

            {/* Description */}
            <p className="text-[11px] text-[#9a9a9e] mt-1 leading-snug">
              {rank.description}
            </p>

            {/* Score threshold */}
            <p
              className="text-[10px] mt-2 font-medium tabular-nums"
              style={{ color: rank.accentColor + "99" }}
            >
              {rank.threshold === 0
                ? "Starting rank"
                : `Requires ${rank.threshold.toLocaleString()} score`}
            </p>

            {/* Tooltip arrow */}
            <div
              className={`absolute -translate-x-1/2 w-3 h-3 rotate-45 ${
                tooltipStyle.top ? "-top-[7px]" : "-bottom-[7px]"
              }`}
              style={{
                left: arrowLeft,
                background: "#18181b",
                borderRight: !tooltipStyle.top ? `1px solid ${rank.borderColor}44` : "none",
                borderBottom: !tooltipStyle.top ? `1px solid ${rank.borderColor}44` : "none",
                borderLeft: tooltipStyle.top ? `1px solid ${rank.borderColor}44` : "none",
                borderTop: tooltipStyle.top ? `1px solid ${rank.borderColor}44` : "none",
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── SVG rendering (unchanged from original) ─────────────────────────────────

function BadgeSvg({
  rankId,
  className,
}: {
  rankId: RankId;
  className: string;
}): JSX.Element | null {
  if (rankId === "novice") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#8b9d83" stroke="#e8e1d5" strokeWidth="2" />
        <circle cx="50" cy="50" r="44" stroke="#e8e1d5" strokeWidth="0.5" strokeDasharray="4 4" />
        <path d="M 30 75 Q 50 60 70 75 Z" fill="#5c544d" />
        <path d="M 50 70 Q 50 40 50 35" stroke="#dbe5d2" strokeWidth="3" strokeLinecap="round" />
        <path d="M 50 45 Q 35 40 40 30 Q 45 35 50 45" fill="#dbe5d2" />
        <path d="M 50 45 Q 65 40 60 30 Q 55 35 50 45" fill="#dbe5d2" />
      </svg>
    );
  }

  if (rankId === "builder") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#9dae8f" stroke="#e8e1d5" strokeWidth="2" />
        <circle cx="50" cy="50" r="44" stroke="#e8e1d5" strokeWidth="0.5" />
        <path d="M 25 75 L 75 75 L 70 85 L 30 85 Z" fill="#5c544d" />
        <rect x="40" y="65" width="20" height="10" fill="#d6c6aa" stroke="#5c544d" strokeWidth="1" />
        <rect x="30" y="75" width="20" height="10" fill="#d6c6aa" stroke="#5c544d" strokeWidth="1" />
        <rect x="50" y="75" width="20" height="10" fill="#d6c6aa" stroke="#5c544d" strokeWidth="1" />
        <path d="M 50 65 V 30" stroke="#dbe5d2" strokeWidth="4" strokeLinecap="round" />
        <path d="M 50 45 C 30 45 30 25 50 25 Z" fill="#e8f0e0" />
        <path d="M 50 35 C 70 35 70 15 50 15 Z" fill="#e8f0e0" />
      </svg>
    );
  }

  if (rankId === "craftsman") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#8b6f56" stroke="#d6c6aa" strokeWidth="2" />
        <rect x="30" y="65" width="40" height="15" fill="#5a4634" rx="2" />
        <path d="M 25 75 Q 35 70 30 80 Q 20 85 25 75 Z" fill="#d6c6aa" opacity="0.8" />
        <path d="M 50 65 L 50 45" stroke="#d6c6aa" strokeWidth="6" strokeLinecap="round" />
        <path d="M 50 50 C 10 50 20 10 50 10 C 80 10 90 50 50 50 Z" fill="#e3d6b8" />
        <circle cx="40" cy="25" r="5" fill="#5a4634" opacity="0.3" />
        <circle cx="65" cy="35" r="4" fill="#5a4634" opacity="0.3" />
      </svg>
    );
  }

  if (rankId === "deep_worker") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#2b2522" stroke="#b08d57" strokeWidth="2" />
        <path d="M 30 60 L 70 60 L 75 80 L 25 80 Z" fill="#4a423e" />
        <path d="M 40 50 L 60 50 L 65 60 L 35 60 Z" fill="#5e534f" />
        <circle cx="50" cy="65" r="3" fill="#b08d57" opacity="0.6" />
        <path d="M 45 75 L 48 70 L 52 70 L 55 75" stroke="#b08d57" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M 50 50 Q 50 25 50 20" stroke="#b08d57" strokeWidth="3" strokeLinecap="round" />
        <path d="M 50 30 Q 30 25 38 12 Q 45 20 50 30" fill="#cfb17e" />
        <path d="M 50 30 Q 70 25 62 12 Q 55 20 50 30" fill="#cfb17e" />
      </svg>
    );
  }

  if (rankId === "master") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#1c1c1e" stroke="#c5a059" strokeWidth="2.5" />
        <path d="M 40 25 L 45 15 L 50 22 L 55 15 L 60 25 Z" fill="#c5a059" />
        <path d="M 35 45 C 50 30 70 40 75 60 C 65 80 45 80 45 80 C 45 80 60 65 55 50 C 50 60 40 60 30 50 C 30 50 32 46 35 45 Z" fill="#e8c87f" />
        <circle cx="48" cy="48" r="2" fill="#1c1c1e" />
      </svg>
    );
  }

  if (rankId === "elite") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#141416" stroke="#e0e0e0" strokeWidth="3" />
        <path d="M 35 25 L 42 12 L 50 20 L 58 12 L 65 25 Z" fill="#e0e0e0" />
        <path d="M 32 42 C 45 25 75 35 80 60 C 65 85 45 80 45 80 C 45 80 60 65 55 50 C 50 65 35 60 25 45 C 25 45 28 44 32 42 Z" fill="#ffffff" />
        <path d="M 55 50 C 60 70 40 85 40 85 C 40 85 55 60 35 60 Z" fill="#b0b0b0" />
        <path d="M 45 44 L 52 46 L 47 49 Z" fill="#ff2222" />
        <path d="M 42 42 L 54 45 L 50 43 Z" fill="#141416" />
      </svg>
    );
  }

  return null;
}