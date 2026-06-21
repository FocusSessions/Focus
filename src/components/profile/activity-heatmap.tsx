"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { HeatmapDay, HeatmapGranularity } from "@/types/analytics";
import { toHeatmapGrid, padHeatmapGrid, DAY_LABELS } from "@/lib/analytics";
import { formatDurationShort, dayLabel } from "@/lib/time";

interface ActivityHeatmapProps {
  days: HeatmapDay[];
  granularity?: HeatmapGranularity;
  onGranularityChange?: (g: HeatmapGranularity) => void;
  activeDateKey?: string | null;
  onDayClick?: (dateKey: string | null) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_CLASSES = [
  "bg-black/[0.06] dark:bg-white/[0.06]",
  "bg-[#CBE0BA] dark:bg-[#1E4D2B]",
  "bg-[#8BBD74] dark:bg-[#2E7D32]",
  "bg-[#4D9535] dark:bg-[#4CAF50]",
  "bg-[#1E6B0D] dark:bg-[#81C784]",
] as const;

/** Approximate focus thresholds — used as title attributes on legend swatches. */
const LEVEL_LABELS = ["0 min", "~30 min", "~1 hr", "~1.5 hr", "2 hr+"] as const;

/** Cell size and gap per granularity view. */
const CELL_CONFIG: Record<NonNullable<HeatmapGranularity>, { cellPx: number; gapPx: number }> = {
  month: { cellPx: 24, gapPx: 4 },
  quarter: { cellPx: 18, gapPx: 3 },
  year: { cellPx: 14, gapPx: 3 },
};

const LABEL_W = 32; // px — width of day-of-week label column
const MONTH_LABEL_H = 20; // px — height of the month label row above the grid

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the short month name and the column index it first appears in.
 * Used to render month labels above the grid for quarter/year views.
 */
function getMonthLabels(
  grid: (HeatmapDay | null)[][]
): { label: string; colIdx: number }[] {
  const seen = new Set<string>();
  const labels: { label: string; colIdx: number }[] = [];

  grid.forEach((week, colIdx) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return;
    const date = new Date(firstDay.dateKey + "T00:00:00");
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      labels.push({
        label: date.toLocaleString("default", { month: "short" }),
        colIdx,
      });
    }
  });

  return labels;
}

/** Formats the categories field for display: up to 2 named, then "+N more". */
function formatCategories(cats: string[]): string | null {
  if (cats.length === 0) return null;
  if (cats.length <= 2) return cats.join(", ");
  return `${cats.slice(0, 2).join(", ")} +${cats.length - 2} more`;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  day: HeatmapDay;
}

function TooltipRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-cream/80">{label}</span>
      <span className={`font-medium text-cream ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function HeatmapTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { day } = tooltip;
  const categoryText = formatCategories(day.categories);

  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-cozy border border-border bg-brown shadow-xl"
      style={{ left: Math.max(90, Math.min(typeof window !== 'undefined' ? window.innerWidth - 90 : 1000, tooltip.x)), top: tooltip.y }}
    >
      {/* Mobile view (one line) */}
      <div className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap">
        <span className="font-medium text-sand-light">{dayLabel(day.dateKey)}</span>
        <span className="text-cream/40">·</span>
        {day.totalMs > 0 ? (
          <span className="text-cream">{formatDurationShort(day.totalMs)} focused</span>
        ) : (
          <span className="text-cream/80">No sessions</span>
        )}
      </div>

      {/* Desktop view (rich) */}
      <div className="hidden sm:block min-w-[152px] px-3 py-2 text-xs">
        <p className="mb-1 border-b border-cream/20 pb-1 font-medium text-sand-light">
          {dayLabel(day.dateKey)}
        </p>

        {day.isJoinedDate && (
          <div className="mb-2 mt-1 rounded bg-cream/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-sage">
            Joined Focus
          </div>
        )}

        {day.totalMs > 0 ? (
          <div className="space-y-1.5 pt-0.5">
            <TooltipRow label="Focused" value={formatDurationShort(day.totalMs)} />
            <TooltipRow label="Sessions" value={String(day.sessionsCount)} />
            {day.longestSessionMs > 0 && (
              <TooltipRow label="Longest" value={formatDurationShort(day.longestSessionMs)} />
            )}
            {categoryText && (
              <TooltipRow label="Category" value={categoryText} capitalize />
            )}
          </div>
        ) : (
          <p className="pt-1 text-cream/80">No focus sessions</p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function HeatmapEmpty() {
  return (
    <section className="card w-full max-w-full p-6">
      <h2 className="font-serif text-lg font-medium text-brown">Focus Activity</h2>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="text-3xl" aria-hidden="true">🌱</span>
        <p className="font-medium text-brown">No sessions yet</p>
        <p className="text-sm text-brown-muted">
          Start your first focus session to see your activity here.
        </p>
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityHeatmap({
  days,
  granularity,
  onGranularityChange,
  activeDateKey,
  onDayClick,
}: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { cellPx, gapPx } = CELL_CONFIG[granularity ?? "year"];
  const showMonthLabels = granularity !== "month";

  const grid = useMemo(() => {
    const rawGrid = toHeatmapGrid(days);
    return granularity === "year" ? padHeatmapGrid(rawGrid) : rawGrid;
  }, [days, granularity]);

  const monthLabels = useMemo(
    () => (showMonthLabels ? getMonthLabels(grid) : []),
    [grid, showMonthLabels]
  );

  const gridW = grid.length * (cellPx + gapPx) - gapPx;
  const gridH = 7 * (cellPx + gapPx) - gapPx;
  const totalH = (showMonthLabels ? MONTH_LABEL_H : 0) + gridH + 8; /* +8px bottom breathing room */

  const activeDays = useMemo(() => days.filter((d) => d.totalMs > 0).length, [days]);

  // Scroll to the most recent data only when the granularity view changes,
  // not on every data refresh.
  useEffect(() => {
    if (scrollRef.current && granularity === "year") {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [granularity]);

  useEffect(() => {
    const handleOutsideClick = () => setTooltip(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  if (days.length === 0) return <HeatmapEmpty />;

  return (
    <section className="card w-full p-6 overflow-hidden min-w-0">
      {/* ── Header ── */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-lg font-medium text-brown">Focus Activity</h2>
          <p className="mt-1.5 text-sm text-brown-muted">
            Focused on{" "}
            <span className="font-medium text-brown">{activeDays}</span>{" "}
            {activeDays === 1 ? "day" : "days"} in the last {granularity ?? "year"}.
          </p>
        </div>

        {granularity && onGranularityChange && (
          <div className="flex shrink-0 items-center rounded-cozy border border-border bg-cream p-1">
            {(["month", "quarter", "year"] as HeatmapGranularity[]).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={granularity === g}
                onClick={() => onGranularityChange(g)}
                className={`rounded-cozy px-3 py-1.5 text-xs font-medium transition-all duration-cozy ${granularity === g
                    ? "bg-terracotta text-white"
                    : "text-brown-muted hover:bg-surface hover:text-brown"
                  }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div
        ref={scrollRef}
        className={`relative w-full overflow-x-auto overflow-y-hidden scrollbar-hide ${granularity !== "year" ? "flex justify-center" : ""
          }`}
        style={{ minHeight: totalH }}
        onScroll={() => setTooltip(null)}
      >
        <div
          className="flex flex-col"
          style={{ width: LABEL_W + gapPx + gridW, minWidth: "max-content" }}
        >
          {/* Month labels row — only for quarter/year */}
          {showMonthLabels && monthLabels.length > 0 && (
            <div
              className="relative mb-1 shrink-0"
              style={{ height: MONTH_LABEL_H, marginLeft: LABEL_W + gapPx }}
            >
              {monthLabels.map(({ label, colIdx }) => (
                <span
                  key={`${label}-${colIdx}`}
                  className="absolute text-[10px] leading-none text-brown-muted"
                  style={{ left: colIdx * (cellPx + gapPx) }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Day-of-week labels + cell grid */}
          <div className="flex">
            <div
              className="flex shrink-0 flex-col"
              style={{ width: LABEL_W, gap: gapPx }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end pr-1 text-[10px] leading-none text-brown-muted"
                  style={{ height: cellPx }}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: gapPx, marginLeft: gapPx }}>
              {grid.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col" style={{ gap: gapPx }}>
                  {week.map((day, dayIdx) =>
                    day ? (
                      <button
                        key={day.dateKey}
                        type="button"
                        aria-label={`${dayLabel(day.dateKey)}: ${formatDurationShort(day.totalMs)}`}
                        aria-pressed={activeDateKey === day.dateKey}
                        className={`relative shrink-0 rounded-md transition-transform duration-cozy hover:scale-110
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-1 focus-visible:ring-offset-cream
                          ${LEVEL_CLASSES[day.level]}
                          ${activeDateKey === day.dateKey ? "ring-2 ring-terracotta ring-offset-2 ring-offset-cream" : ""}
                          after:absolute after:-inset-1.5 after:content-['']`}
                        style={{ width: cellPx, height: cellPx }}
                        onMouseEnter={(e) => {
                          if (window.matchMedia("(hover: hover)").matches) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, day });
                          }
                        }}
                        onMouseLeave={() => {
                          if (window.matchMedia("(hover: hover)").matches) {
                            setTooltip(null);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.matchMedia("(hover: none)").matches) {
                            if (tooltip?.day.dateKey === day.dateKey) {
                              setTooltip(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, day });
                            }
                          }
                          onDayClick?.(activeDateKey === day.dateKey ? null : day.dateKey);
                        }}
                      />
                    ) : (
                      <div
                        key={`empty-${weekIdx}-${dayIdx}`}
                        aria-hidden="true"
                        className="shrink-0 rounded-md bg-black/5 dark:bg-white/5"
                        style={{ width: cellPx, height: cellPx }}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tooltip && <HeatmapTooltip tooltip={tooltip} />}
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-4 text-[10px] font-semibold tracking-wider text-brown-muted">
        <span>Less</span>
        <div className="mx-1 flex items-center gap-1">
          {LEVEL_CLASSES.map((cls, i) => (
            <div
              key={i}
              title={LEVEL_LABELS[i]}
              className={`rounded-md ${cls}`}
              style={{ width: 14, height: 14 }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </section>
  );
}