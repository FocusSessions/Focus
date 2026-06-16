export type RankId =
  | "novice"
  | "builder"
  | "craftsman"
  | "deep_worker"
  | "master"
  | "elite";

export interface RankDef {
  id: RankId;
  name: string;
  /** Short motivational blurb shown in tooltips and rank screens. */
  description: string;
  /** Minimum Productivity Score to reach this rank. */
  threshold: number;
  /** Tailwind background class for rank chips/pills. */
  color: string;
  /** Tailwind text class that contrasts against `color`. */
  textColor: string;
  /** Hex border/ring color for the rank badge. */
  borderColor: string;
  /**
   * CSS rgba glow used in box-shadow effects.
   * NOTE: dark ranks previously had near-black glows — fixed to the rank's
   * accent hue so the effect is actually visible.
   */
  glow: string;
  /** Primary accent hex used for icons, progress bars, and tooltip headings. */
  accentColor: string;
}

export const RANKS: RankDef[] = [
  {
    id: "novice",
    name: "Novice",
    description: "Your journey begins. Every expert started right here.",
    threshold: 0,
    color: "bg-[#8b9d83]",
    textColor: "text-[#1e2b1c]",
    borderColor: "#c5d4bd",
    glow: "rgba(139, 157, 131, 0.5)",
    accentColor: "#dbe5d2",
  },
  {
    id: "builder",
    name: "Builder",
    description: "You're forming habits and laying the groundwork.",
    threshold: 100,
    color: "bg-[#9dae8f]",
    textColor: "text-[#1e2b1c]",
    borderColor: "#bdd0b0",
    glow: "rgba(157, 174, 143, 0.5)",
    accentColor: "#e8f0e0",
  },
  {
    id: "craftsman",
    name: "Craftsman",
    description: "Deliberate practice is your standard. Quality over quantity.",
    threshold: 250,
    color: "bg-[#8b6f56]",
    textColor: "text-[#f5ebe0]",
    borderColor: "#c4a882",
    // Was rgba(139,111,86,0.4) — slightly boosted saturation for a warmer glow
    glow: "rgba(180, 140, 100, 0.55)",
    accentColor: "#d6c6aa",
  },
  {
    id: "deep_worker",
    name: "Deep Worker",
    description: "Flow states are your natural habitat. Distraction is foreign to you.",
    threshold: 450,
    color: "bg-[#2b2522]",
    textColor: "text-[#cfb17e]",
    borderColor: "#b08d57",
    // Was rgba(43,37,34,0.4) — almost invisible against dark backgrounds; changed to gold hue
    glow: "rgba(176, 141, 87, 0.55)",
    accentColor: "#b08d57",
  },
  {
    id: "master",
    name: "Master",
    description: "Sustained concentration at its highest form. Few reach this level.",
    threshold: 700,
    color: "bg-[#1c1c1e]",
    textColor: "text-[#c5a059]",
    borderColor: "#c5a059",
    // Was rgba(28,28,30,0.4) — invisible; changed to accent gold
    glow: "rgba(197, 160, 89, 0.6)",
    accentColor: "#c5a059",
  },
  {
    id: "elite",
    name: "Elite",
    description: "A rare tier. You've achieved what most only aspire to.",
    threshold: 900,
    color: "bg-[#141416]",
    textColor: "text-white",
    borderColor: "#e2e2e2",
    glow: "rgba(212, 175, 55, 0.7)",
    accentColor: "#d4af37",
  },
];

export interface RankResult {
  current: RankDef;
  previous: RankDef | null;
  next: RankDef | null;
  /**
   * Fraction (0–1) of the way from current rank's threshold to the next.
   * Is 1 when the user is already at Elite.
   */
  progressToNext: number;
}

export function determineRank(score: number): RankResult {
  let current: RankDef = RANKS[0];
  let previous: RankDef | null = null;
  let next: RankDef | null = null;

  for (let i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].threshold) {
      current = RANKS[i];
      previous = i > 0 ? RANKS[i - 1] : null;
    } else {
      next = RANKS[i];
      break;
    }
  }

  const progressToNext = next
    ? Math.min(1, (score - current.threshold) / (next.threshold - current.threshold))
    : 1;

  return { current, previous, next, progressToNext };
}