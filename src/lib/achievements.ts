import type { Activity, FocusSessionActivity } from "@/types";
import { dateKey, getLogicalDateKey } from "@/lib/time";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category:
  | "Rhythms"
  | "Volume"
  | "Depth"
  | "Specialization"
  | "Patterns"
  | "Stats"
  | "Social"
  | "Elite"
  | "Onboarding";
  iconName: string;
  tier: "bronze" | "silver" | "gold";
  unlockedAt: number | null;
  /**
   * For locked achievements with a measurable metric, provides current/total
   * so the UI can render a progress bar.
   * null = binary (either done or not) or already unlocked.
   */
  progress: { current: number; total: number } | null;
}

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlockedAt" | "progress">[] = [
  // Rhythms
  { id: "weekly_cadence", name: "Weekly Cadence", description: "Log at least one session every day for a full calendar week.", category: "Rhythms", iconName: "Calendar", tier: "bronze" },
  { id: "unbroken_fortnight", name: "Unbroken Fortnight", description: "Maintain a 14-day focus streak.", category: "Rhythms", iconName: "Link2", tier: "silver" },
  { id: "monthly_grid", name: "The Monthly Grid", description: "Achieve a 30-day focus streak.", category: "Rhythms", iconName: "LayoutGrid", tier: "gold" },
  { id: "bimodal_rhythm", name: "Bimodal Rhythm", description: "Complete two 90+ min sessions in one day, separated by at least an hour.", category: "Rhythms", iconName: "Activity", tier: "silver" },
  // Volume
  { id: "kilohour_foundation", name: "Kilohour Foundation", description: "Accumulate 100 total hours of focus time.", category: "Volume", iconName: "Mountain", tier: "silver" },
  { id: "volume_i", name: "Volume I", description: "Successfully complete 50 distinct focus sessions.", category: "Volume", iconName: "BookOpen", tier: "bronze" },
  { id: "quarter_mark", name: "The Quarter Mark", description: "Accumulate 250 total hours of focus time.", category: "Volume", iconName: "Building2", tier: "gold" },
  // Depth
  { id: "monastic_state", name: "Monastic State", description: "Complete a single, continuous focus session exceeding 4 hours.", category: "Depth", iconName: "PersonStanding", tier: "gold" },
  { id: "golden_mean", name: "The Golden Mean", description: "Complete 10 sessions that land between 45–60 minutes.", category: "Depth", iconName: "Scale", tier: "silver" },
  // Specialization
  { id: "domain_mastery", name: "Domain Mastery", description: "Log 50 total hours within a single category.", category: "Specialization", iconName: "Target", tier: "gold" },
  { id: "polymath", name: "Polymath", description: "Log at least 10 hours across 3 or more distinct categories.", category: "Specialization", iconName: "Globe2", tier: "silver" },
  { id: "shipped", name: "Shipped", description: "Complete a session with a custom title 10 times in a row.", category: "Specialization", iconName: "Ship", tier: "bronze" },
  // Patterns
  { id: "first_light", name: "First Light", description: "Complete a session of 60+ minutes before 7:00 AM.", category: "Patterns", iconName: "Sunrise", tier: "bronze" },
  { id: "third_shift", name: "The Third Shift", description: "Log a session during atypical weekend hours (Friday/Saturday evening).", category: "Patterns", iconName: "Moon", tier: "silver" },
  { id: "meridian_alignment", name: "Meridian Alignment", description: "Log a session at the same start hour for 5 consecutive weekdays.", category: "Patterns", iconName: "Compass", tier: "gold" },
  // Stats
  { id: "low_variance", name: "Low Variance", description: "Complete 7 consecutive sessions where each duration deviates less than 5 minutes from their group average.", category: "Stats", iconName: "LineChart", tier: "silver" },
  { id: "velocity_gain", name: "Velocity Gain", description: "Increase total focus hours week-over-week for three consecutive weeks.", category: "Stats", iconName: "Rocket", tier: "gold" },
  { id: "high_efficiency", name: "High Efficiency", description: "Maintain a 100% completion rate over 20 consecutive timer activations.", category: "Stats", iconName: "Settings", tier: "gold" },
  // Social
  { id: "proof_of_craft", name: "Proof of Craft", description: "Export and share 3 distinct weekly recap summaries.", category: "Social", iconName: "ScrollText", tier: "bronze" },
  { id: "open_ledger", name: "Open Ledger", description: "Maintain a 7-day streak consisting entirely of 'Public' visibility sessions.", category: "Social", iconName: "BookOpenCheck", tier: "silver" },
  { id: "synchronous_flow", name: "Synchronous Flow", description: "Complete a deep work block inside a shared focus room.", category: "Social", iconName: "Users", tier: "gold" },
  // Elite
  { id: "cal_newports_week", name: "Cal Newport's Week", description: "Log 20 hours of pure deep work within a single calendar week.", category: "Elite", iconName: "MountainSnow", tier: "gold" },
  { id: "silver_ledger", name: "The Silver Ledger", description: "Accumulate 500 total hours of registered focus time.", category: "Elite", iconName: "Medal", tier: "gold" },
  { id: "the_365", name: "The 365", description: "Log at least one session on 365 distinct days.", category: "Elite", iconName: "Crown", tier: "gold" },
  { id: "the_long_game", name: "The Long Game", description: "Unlock the Monthly Overview by logging focus activity for over 60 days.", category: "Elite", iconName: "History", tier: "silver" },
  { id: "annual_report", name: "Annual Report", description: "Unlock the Yearly Overview by logging focus activity for over 365 days.", category: "Elite", iconName: "Landmark", tier: "gold" },
  // Onboarding
  { id: "first_principles", name: "First Principles", description: "Complete a session and assign it a custom title.", category: "Onboarding", iconName: "Ruler", tier: "bronze" },
  { id: "workspace_calibration", name: "Workspace Calibration", description: "Complete your first sessions across two different categories.", category: "Onboarding", iconName: "SlidersHorizontal", tier: "bronze" },
  { id: "local_ledger", name: "Local Ledger", description: "Successfully save 3 consecutive sessions using the 'Private' setting.", category: "Onboarding", iconName: "LockKeyhole", tier: "bronze" },
  { id: "second_nature", name: "Second Nature", description: "Log a focus session on two consecutive days.", category: "Onboarding", iconName: "Sprout", tier: "bronze" },
  { id: "initial_cadence", name: "Initial Cadence", description: "Successfully log 3 focus sessions within your first 48 hours.", category: "Onboarding", iconName: "Timer", tier: "bronze" },
  { id: "the_baseline", name: "The Baseline", description: "Accumulate your first 3 hours of total focus time.", category: "Onboarding", iconName: "BarChart3", tier: "bronze" },
  { id: "the_hourglass", name: "The Hourglass", description: "Complete a single, continuous focus session lasting exactly 60 minutes or more.", category: "Onboarding", iconName: "Hourglass", tier: "bronze" },
  { id: "clean_slate", name: "Clean Slate", description: "Complete a focus session of 30+ minutes before 12:00 PM on a Monday.", category: "Onboarding", iconName: "Sparkles", tier: "bronze" },
  { id: "deliberate_block", name: "Deliberate Block", description: "Complete a session that lands within the traditional human optimal focus window (45–50 minutes).", category: "Onboarding", iconName: "Brain", tier: "bronze" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the ISO date string for the Monday of the week containing `ts`.
 * Used as a stable weekly bucket key.
 */
function getWeekKey(ts: number): string {
  const d = new Date(ts);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

/**
 * Parses a "YYYY-MM-DD" dateKey string into a local-midnight Date.
 *
 * BUG FIX: The original code did:
 *   new Date(dk.split('-').map(Number).join('-'))
 * which produced strings like "2024-1-5" (dropping leading zeros).
 * `new Date("2024-1-5")` is implementation-defined and can produce
 * midnight UTC (shifting the date by timezone offset). Using the
 * `Date(y, m-1, d)` constructor always gives local midnight.
 */
function parseDateKey(dk: string): Date {
  const [y, m, d] = dk.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

export function evaluateAchievements(
  activities: Activity[],
  joinedAt?: number
): Achievement[] {
  const focusSessions = activities.filter(
    (a): a is FocusSessionActivity => a.type === "focus_session"
  );

  // Nothing to evaluate — return everything locked with null progress
  if (focusSessions.length === 0) {
    return ACHIEVEMENT_DEFINITIONS.map((def) => ({
      ...def,
      unlockedAt: null,
      progress: null,
    }));
  }

  // Sort once; reuse everywhere
  const chronological = [...focusSessions].sort(
    (a, b) => a.startedAt - b.startedAt
  );
  const firstSessionTime = chronological[0].startedAt;

  // ── Accumulators ────────────────────────────────────────────────────────────
  const unlocked = new Map<string, number>(); // achievementId → unlockedAt timestamp

  let totalMs = 0;

  // Custom title streak (consecutive sessions WITH a custom title)
  let customTitleStreak = 0;
  let maxCustomTitleStreak = 0;

  // Private visibility streak
  let privateStreak = 0;
  let maxPrivateStreak = 0;

  // 45–60 min sessions count (Golden Mean)
  let goldenMeanCount = 0;

  // Category hours map
  const categoryMs = new Map<string, number>();

  // Per-day session map (used for streak + bimodal + meridian checks)
  const dayMap = new Map<string, FocusSessionActivity[]>();

  // Low-variance sliding window (7 sessions)
  const lvWindow: number[] = [];

  // Weekly totals
  const weeklyMs = new Map<string, number>();
  const weeklyLastEnd = new Map<string, number>(); // week key → last session endedAt in that week

  // ── Per-session loop ─────────────────────────────────────────────────────────
  // BUG FIX: Original code used `chronological.indexOf(session)` inside a
  // for-of loop — O(n²). Changed to an indexed for-loop so the index is O(1).
  for (let i = 0; i < chronological.length; i++) {
    const session = chronological[i];
    const dk = getLogicalDateKey(session.startedAt);

    // Day map
    if (!dayMap.has(dk)) dayMap.set(dk, []);
    dayMap.get(dk)!.push(session);

    // Totals
    totalMs += session.durationMs;

    const isCustomTitle =
      !!session.title &&
      session.title.trim().length > 0 &&
      session.title.trim() !== "Focus Session";

    // Update streaks
    if (isCustomTitle) {
      customTitleStreak++;
      if (customTitleStreak > maxCustomTitleStreak)
        maxCustomTitleStreak = customTitleStreak;
    } else {
      customTitleStreak = 0;
    }

    if (session.visibility === "private") {
      privateStreak++;
      if (privateStreak > maxPrivateStreak) maxPrivateStreak = privateStreak;
    } else {
      privateStreak = 0;
    }

    const sessionMins = session.durationMs / 60_000;
    if (sessionMins >= 45 && sessionMins <= 60) goldenMeanCount++;

    const catKey = session.category || "other";
    categoryMs.set(catKey, (categoryMs.get(catKey) || 0) + session.durationMs);

    // Weekly totals
    const wk = getWeekKey(session.startedAt);
    weeklyMs.set(wk, (weeklyMs.get(wk) || 0) + session.durationMs);
    weeklyLastEnd.set(wk, session.endedAt);

    // Low Variance: 7-session sliding window; all within 5 min of their mean
    lvWindow.push(session.durationMs);
    if (lvWindow.length > 7) lvWindow.shift();
    if (lvWindow.length === 7 && !unlocked.has("low_variance")) {
      const avg = lvWindow.reduce((a, b) => a + b, 0) / 7;
      const allClose = lvWindow.every((d) => Math.abs(d - avg) <= 5 * 60_000);
      if (allClose) unlocked.set("low_variance", session.endedAt);
    }

    // ── Onboarding ─────────────────────────────────────────────────────────────

    if (!unlocked.has("first_principles") && isCustomTitle) {
      unlocked.set("first_principles", session.endedAt);
    }

    if (!unlocked.has("workspace_calibration") && categoryMs.size >= 2) {
      unlocked.set("workspace_calibration", session.endedAt);
    }

    if (!unlocked.has("local_ledger") && privateStreak >= 3) {
      unlocked.set("local_ledger", session.endedAt);
    }

    // BUG FIX: original used chronological.indexOf(session) (O(n)).
    // Now uses the loop index `i` directly.
    if (!unlocked.has("initial_cadence")) {
      if (
        i >= 2 &&
        session.startedAt - firstSessionTime <= 48 * 3_600_000
      ) {
        unlocked.set("initial_cadence", session.endedAt);
      }
    }

    if (!unlocked.has("the_baseline") && totalMs >= 3 * 3_600_000) {
      unlocked.set("the_baseline", session.endedAt);
    }

    if (!unlocked.has("the_hourglass") && session.durationMs >= 3_600_000) {
      unlocked.set("the_hourglass", session.endedAt);
    }

    if (
      !unlocked.has("deliberate_block") &&
      sessionMins >= 45 &&
      sessionMins <= 50
    ) {
      unlocked.set("deliberate_block", session.endedAt);
    }

    if (!unlocked.has("clean_slate") && session.durationMs >= 30 * 60_000) {
      const d = new Date(session.startedAt);
      if (d.getDay() === 1 && d.getHours() < 12) {
        unlocked.set("clean_slate", session.endedAt);
      }
    }

    // ── Depth ───────────────────────────────────────────────────────────────────

    if (!unlocked.has("monastic_state") && session.durationMs >= 4 * 3_600_000) {
      unlocked.set("monastic_state", session.endedAt);
    }

    if (!unlocked.has("golden_mean") && goldenMeanCount >= 10) {
      unlocked.set("golden_mean", session.endedAt);
    }

    // ── Volume ──────────────────────────────────────────────────────────────────

    if (!unlocked.has("volume_i") && i >= 49) {
      unlocked.set("volume_i", session.endedAt);
    }

    if (!unlocked.has("kilohour_foundation") && totalMs >= 100 * 3_600_000) {
      unlocked.set("kilohour_foundation", session.endedAt);
    }

    if (!unlocked.has("quarter_mark") && totalMs >= 250 * 3_600_000) {
      unlocked.set("quarter_mark", session.endedAt);
    }

    if (!unlocked.has("silver_ledger") && totalMs >= 500 * 3_600_000) {
      unlocked.set("silver_ledger", session.endedAt);
    }

    // ── Specialization ──────────────────────────────────────────────────────────

    if (!unlocked.has("domain_mastery")) {
      const topCat = Math.max(...Array.from(categoryMs.values()));
      if (topCat >= 50 * 3_600_000) {
        unlocked.set("domain_mastery", session.endedAt);
      }
    }

    if (!unlocked.has("polymath")) {
      const over10 = Array.from(categoryMs.values()).filter(
        (ms) => ms >= 10 * 3_600_000
      ).length;
      if (over10 >= 3) unlocked.set("polymath", session.endedAt);
    }

    if (!unlocked.has("shipped") && customTitleStreak >= 10) {
      unlocked.set("shipped", session.endedAt);
    }

    // ── Patterns ────────────────────────────────────────────────────────────────

    if (!unlocked.has("first_light") && session.durationMs >= 3_600_000) {
      const d = new Date(session.startedAt);
      if (d.getHours() < 7) unlocked.set("first_light", session.endedAt);
    }

    if (!unlocked.has("third_shift")) {
      const d = new Date(session.startedAt);
      const day = d.getDay();
      const hour = d.getHours();
      // Friday (5) or Saturday (6) at or after 18:00
      if ((day === 5 || day === 6) && hour >= 18) {
        unlocked.set("third_shift", session.endedAt);
      }
    }

    // ── Stats ───────────────────────────────────────────────────────────────────

    // High Efficiency: "100% completion rate over 20 consecutive timer activations."
    // Since our Activity[] only contains completed focus_session entries,
    // every logged session counts as completed. This will be accurate once
    // cancelled/abandoned session types are tracked in Activity.
    if (!unlocked.has("high_efficiency") && i >= 19) {
      unlocked.set("high_efficiency", session.endedAt);
    }
  }

  // ── Velocity Gain ─────────────────────────────────────────────────────────
  // Three consecutive weeks with strictly increasing focus totals.
  const sortedWeeks = Array.from(weeklyMs.keys()).sort();
  for (let i = 2; i < sortedWeeks.length; i++) {
    const w0 = weeklyMs.get(sortedWeeks[i - 2])!;
    const w1 = weeklyMs.get(sortedWeeks[i - 1])!;
    const w2 = weeklyMs.get(sortedWeeks[i])!;
    if (w1 > w0 && w2 > w1 && !unlocked.has("velocity_gain")) {
      unlocked.set("velocity_gain", weeklyLastEnd.get(sortedWeeks[i])!);
    }
  }

  // ── Cal Newport's Week ─────────────────────────────────────────────────────
  Array.from(weeklyMs.entries()).forEach(([wk, ms]) => {
    if (ms >= 20 * 3_600_000 && !unlocked.has("cal_newports_week")) {
      unlocked.set("cal_newports_week", weeklyLastEnd.get(wk)!);
    }
  });

  // ── Daily streak + day-level achievements ──────────────────────────────────
  const sortedDays = Array.from(dayMap.keys()).sort();
  let streak = 0;
  let maxStreak = 0;
  let publicStreak = 0;
  let maxPublicStreak = 0;
  let prevDate: Date | null = null;

  for (const dk of sortedDays) {
    const d = parseDateKey(dk);
    const daySessions = dayMap.get(dk)!;
    const lastEnd = daySessions[daySessions.length - 1].endedAt;

    // Daily streak
    if (prevDate !== null) {
      const diffDays = Math.round(
        (d.getTime() - prevDate.getTime()) / (1_000 * 3_600 * 24)
      );
      streak = diffDays === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    if (streak > maxStreak) maxStreak = streak;

    // Public-only streak
    const allPublic = daySessions.every((s) => s.visibility === "public");
    if (allPublic) {
      if (
        prevDate !== null &&
        Math.round((d.getTime() - prevDate.getTime()) / (1_000 * 3_600 * 24)) === 1
      ) {
        publicStreak++;
      } else {
        publicStreak = 1;
      }
    } else {
      publicStreak = 0;
    }
    if (publicStreak > maxPublicStreak) maxPublicStreak = publicStreak;

    // Streak achievements
    if (!unlocked.has("second_nature") && streak >= 2)
      unlocked.set("second_nature", lastEnd);
    if (!unlocked.has("unbroken_fortnight") && streak >= 14)
      unlocked.set("unbroken_fortnight", lastEnd);
    if (!unlocked.has("monthly_grid") && streak >= 30)
      unlocked.set("monthly_grid", lastEnd);
    if (!unlocked.has("open_ledger") && publicStreak >= 7)
      unlocked.set("open_ledger", lastEnd);

    // Bimodal Rhythm
    if (!unlocked.has("bimodal_rhythm")) {
      const over90 = daySessions.filter((s) => s.durationMs >= 90 * 60_000);
      if (over90.length >= 2) {
        outer: for (let i = 0; i < over90.length - 1; i++) {
          for (let j = i + 1; j < over90.length; j++) {
            if (over90[j].startedAt - over90[i].endedAt >= 3_600_000) {
              unlocked.set("bimodal_rhythm", lastEnd);
              break outer;
            }
          }
        }
      }
    }

    prevDate = d;
  }

  // ── Meridian Alignment ────────────────────────────────────────────────────
  // Same start-hour on 5 consecutive weekdays (Mon→Fri, wrapping Fri→Mon).
  if (!unlocked.has("meridian_alignment")) {
    // Build weekday-only map: dateKey → hour of first session that day
    const weekdayHours = new Map<string, number>();
    for (const dk of sortedDays) {
      const dow = parseDateKey(dk).getDay();
      if (dow >= 1 && dow <= 5) {
        const first = dayMap.get(dk)![0];
        weekdayHours.set(dk, new Date(first.startedAt).getHours());
      }
    }

    const weekdayKeys = Array.from(weekdayHours.keys()).sort();
    let mStreak = 1;

    for (let i = 1; i < weekdayKeys.length; i++) {
      const prevD = parseDateKey(weekdayKeys[i - 1]);
      const currD = parseDateKey(weekdayKeys[i]);
      const diff = Math.round(
        (currD.getTime() - prevD.getTime()) / (1_000 * 3_600 * 24)
      );
      // A "consecutive weekday" gap is 1 day (Mon–Fri) or 3 days (Fri→Mon)
      const isConsecutiveWeekday =
        diff === 1 || (diff === 3 && prevD.getDay() === 5);
      const sameHour =
        weekdayHours.get(weekdayKeys[i]) === weekdayHours.get(weekdayKeys[i - 1]);

      if (isConsecutiveWeekday && sameHour) {
        mStreak++;
        if (mStreak >= 5) {
          const sessions = dayMap.get(weekdayKeys[i])!;
          unlocked.set(
            "meridian_alignment",
            sessions[sessions.length - 1].endedAt
          );
          break;
        }
      } else {
        mStreak = 1;
      }
    }
  }

  // ── The 365 ───────────────────────────────────────────────────────────────
  if (!unlocked.has("the_365") && dayMap.size >= 365) {
    unlocked.set("the_365", chronological[chronological.length - 1].endedAt);
  }

  // ── Time-based (joinedAt) ─────────────────────────────────────────────────
  if (joinedAt) {
    const daysSinceJoined = (Date.now() - joinedAt) / (1_000 * 60 * 60 * 24);
    if (!unlocked.has("the_long_game") && daysSinceJoined >= 60) {
      unlocked.set("the_long_game", Date.now());
    }
    if (!unlocked.has("annual_report") && daysSinceJoined >= 365) {
      unlocked.set("annual_report", Date.now());
    }
  }

  // ── Progress for locked achievements ──────────────────────────────────────
  const totalHours = Math.floor(totalMs / 3_600_000);
  const sessionCount = chronological.length;
  const distinctDays = dayMap.size;
  const topCatHours = Math.floor(
    Math.max(0, ...Array.from(categoryMs.values())) / 3_600_000
  );
  const catsOver10h = Array.from(categoryMs.values()).filter(
    (ms) => ms >= 10 * 3_600_000
  ).length;
  const bestWeekHours = Math.floor(
    Math.max(0, ...Array.from(weeklyMs.values())) / 3_600_000
  );
  const daysSinceJoined = joinedAt
    ? (Date.now() - joinedAt) / (1_000 * 60 * 60 * 24)
    : 0;

  function progressFor(
    id: string
  ): { current: number; total: number } | null {
    // Already unlocked — no progress bar needed
    if (unlocked.has(id)) return null;

    switch (id) {
      // Rhythms / streaks
      case "second_nature": return { current: Math.min(maxStreak, 2), total: 2 };
      case "weekly_cadence": return { current: Math.min(maxStreak, 7), total: 7 };
      case "unbroken_fortnight": return { current: Math.min(maxStreak, 14), total: 14 };
      case "monthly_grid": return { current: Math.min(maxStreak, 30), total: 30 };
      case "bimodal_rhythm": return null; // single-day binary check
      // Volume
      case "volume_i": return { current: Math.min(sessionCount, 50), total: 50 };
      case "kilohour_foundation": return { current: Math.min(totalHours, 100), total: 100 };
      case "quarter_mark": return { current: Math.min(totalHours, 250), total: 250 };
      case "silver_ledger": return { current: Math.min(totalHours, 500), total: 500 };
      case "the_365": return { current: Math.min(distinctDays, 365), total: 365 };
      // Depth
      case "golden_mean": return { current: Math.min(goldenMeanCount, 10), total: 10 };
      case "monastic_state": return null; // single-session binary
      // Specialization
      case "domain_mastery": return { current: Math.min(topCatHours, 50), total: 50 };
      case "polymath": return { current: Math.min(catsOver10h, 3), total: 3 };
      case "shipped": return { current: Math.min(maxCustomTitleStreak, 10), total: 10 };
      // Patterns — all binary single-event checks
      case "first_light": return null;
      case "third_shift": return null;
      case "clean_slate": return null;
      case "meridian_alignment": return null; // complex multi-day pattern
      // Stats
      case "low_variance": return null; // sliding-window pattern
      case "velocity_gain": return null; // week-over-week pattern
      case "high_efficiency": return { current: Math.min(sessionCount, 20), total: 20 };
      // Social — externally triggered
      case "proof_of_craft": return null;
      case "synchronous_flow": return null;
      case "open_ledger": return { current: Math.min(maxPublicStreak, 7), total: 7 };
      // Elite
      case "cal_newports_week": return { current: Math.min(bestWeekHours, 20), total: 20 };
      case "the_long_game": return joinedAt
        ? { current: Math.min(Math.floor(daysSinceJoined), 60), total: 60 }
        : null;
      case "annual_report": return joinedAt
        ? { current: Math.min(Math.floor(daysSinceJoined), 365), total: 365 }
        : null;
      // Onboarding
      case "the_baseline": return { current: Math.min(totalHours, 3), total: 3 };
      case "workspace_calibration": return { current: Math.min(categoryMs.size, 2), total: 2 };
      case "local_ledger": return { current: Math.min(maxPrivateStreak, 3), total: 3 };
      case "initial_cadence": return { current: Math.min(sessionCount, 3), total: 3 };
      // Everything else: no trackable metric
      default: return null;
    }
  }

  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    unlockedAt: unlocked.get(def.id) ?? null,
    progress: progressFor(def.id),
  }));
}