import type { Activity, FocusSessionActivity } from "@/types";

export interface ProductivityMetrics {
  score: number;
  consistencyScore: number; // 0 to 100 percentage
}

export function calculateProductivityScore(activities: Activity[], joinedAt?: number): ProductivityMetrics {
  const focusSessions = activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  
  if (focusSessions.length === 0) {
    return { score: 0, consistencyScore: 0 };
  }

  let totalHours = 0;
  for (const session of focusSessions) {
    totalHours += session.durationMs / 3600000;
  }

  // 1. Experience Index (V)
  const v = 1 - Math.exp(-totalHours / 400);

  // 2. Consistency Index (K)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const activeDaysSet30 = new Set();
  const activeDaysSet90 = new Set();

  for (const session of focusSessions) {
    const started = new Date(session.startedAt);
    // Shift time back by 4 hours so sessions before 4 AM count towards the previous day
    const adjustedForDay = new Date(started.getTime() - 4 * 60 * 60 * 1000);
    const dayKey = `${adjustedForDay.getFullYear()}-${adjustedForDay.getMonth()}-${adjustedForDay.getDate()}`;
    
    if (started >= thirtyDaysAgo) {
      activeDaysSet30.add(dayKey);
    }
    if (started >= ninetyDaysAgo) {
      activeDaysSet90.add(dayKey);
    }
  }

  const accountAgeDays = joinedAt ? Math.max(1, Math.ceil((Date.now() - joinedAt) / (1000 * 60 * 60 * 24))) : 30;

  const r30 = activeDaysSet30.size / Math.min(30, accountAgeDays);
  const r90 = activeDaysSet90.size / Math.min(90, accountAgeDays);
  
  // Apply the firm rule: if r30 is 0, K is 0
  const k = r30 === 0 ? 0 : Math.pow(r30, 0.6) * Math.pow(r90, 0.4);

  // 3. Focus Depth Index (Q)
  const avgMinutes = (totalHours * 60) / focusSessions.length;
  const q = 1 - Math.exp(-avgMinutes / 35);

  // Final Score
  const score = Math.floor(Math.min(1000, (500 * v) + (400 * k) + (100 * q)));
  const consistencyScore = Math.min(100, Math.round(k * 100)); // Map K to 0-100 for legacy components if needed

  return {
    score,
    consistencyScore,
  };
}
