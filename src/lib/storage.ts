import type {
  Activity,
  FocusSessionActivity,
  ActiveTimer,
  MusicSettings,
  UploadedTrack,
  UserPreferences,
} from "@/types";
import { DEFAULT_DAILY_GOAL_MINUTES, DEFAULT_SESSION_GOAL_MINUTES } from "@/types";

const DB_NAME = "focus-timer";
const DB_VERSION = 2; // Incremented for new object store
const LS_ACTIVITIES = "ft_activities";
const LS_SESSIONS = "ft_sessions"; // Old key for migration
const LS_KV = "ft_kv";

const defaultMusic: MusicSettings = {
  volume: 0.6,
  loop: true,
  lastTrackId: null,
};

const defaultPreferences: UserPreferences = {
  dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
  sessionGoalMinutes: DEFAULT_SESSION_GOAL_MINUTES,
  showMilliseconds: false,
  timerDirection: "up",
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("activities")) {
        db.createObjectStore("activities", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("uploads")) {
        db.createObjectStore("uploads", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function lsGetActivities(): Activity[] {
  try {
    const raw = localStorage.getItem(LS_ACTIVITIES);
    if (raw) return JSON.parse(raw);
    
    // Migration fallback
    const oldRaw = localStorage.getItem(LS_SESSIONS);
    if (oldRaw) {
      const oldSessions = JSON.parse(oldRaw);
      const migrated = oldSessions.map((s: any) => ({
        id: s.id,
        type: 'focus_session',
        title: s.label || 'Legacy Session',
        durationMs: s.durationMs,
        category: 'other',
        visibility: 'private',
        createdAt: s.endedAt || Date.now(),
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      } as FocusSessionActivity));
      lsSetActivities(migrated);
      localStorage.removeItem(LS_SESSIONS);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function lsSetActivities(activities: Activity[]): void {
  localStorage.setItem(LS_ACTIVITIES, JSON.stringify(activities));
}

function lsGetKv<T>(key: string, fallback: T): T {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KV) ?? "{}");
    return key in all ? all[key] : fallback;
  } catch {
    return fallback;
  }
}

function lsSetKv(key: string, value: unknown): void {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KV) ?? "{}");
    all[key] = value;
    localStorage.setItem(LS_KV, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

let dbReady = false;

async function ensureDb(): Promise<boolean> {
  if (dbReady) return true;
  try {
    await openDb();
    dbReady = true;
    return true;
  } catch {
    return false;
  }
}

export async function loadActivities(): Promise<Activity[]> {
  const ok = await ensureDb();
  if (ok) {
    const rows = await idbGetAll<Activity>("activities");
    if (rows.length > 0) {
      lsSetActivities(rows);
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    }
  }
  return lsGetActivities().sort((a, b) => b.createdAt - a.createdAt);
}

export async function persistActivities(activities: Activity[]): Promise<void> {
  lsSetActivities(activities);
  const ok = await ensureDb();
  if (!ok) return;
  const db = await openDb();
  const tx = db.transaction("activities", "readwrite");
  const store = tx.objectStore("activities");
  
  // Clear the entire store in the same transaction
  store.clear();
  
  // Add all new activities
  for (const a of activities) {
    store.put(a);
  }
}

export async function saveActivity(activity: Activity): Promise<Activity[]> {
  const activities = await loadActivities();
  const next = [activity, ...activities];
  await persistActivities(next);
  return next;
}

export async function updateActivity(
  id: string,
  updates: Partial<Pick<FocusSessionActivity, "title" | "category" | "visibility" | "description">>
): Promise<Activity[]> {
  const activities = await loadActivities();
  const next = activities.map((a) => {
    if (a.id === id && a.type === 'focus_session') {
      return { ...a, ...updates };
    }
    return a;
  });
  await persistActivities(next);
  return next;
}

export async function deleteActivity(id: string): Promise<Activity[]> {
  const activities = await loadActivities();
  const next = activities.filter((a) => a.id !== id);
  await persistActivities(next);
  return next;
}

// ---------- Cloud Sync (Supabase) ----------

export async function saveActivityToCloud(
  activity: FocusSessionActivity,
  userId: string
): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("sessions").upsert({
      id: activity.id,
      user_id: userId,
      title: activity.title,
      description: activity.description || null,
      duration_ms: activity.durationMs,
      category: activity.category,
      visibility: activity.visibility,
      started_at: new Date(activity.startedAt).toISOString(),
      ended_at: new Date(activity.endedAt).toISOString(),
      tz_offset: activity.timezoneOffset ?? new Date().getTimezoneOffset(),
    });
  } catch (err) {
    console.error("[CloudSync] Failed to save activity:", err);
  }
}

export async function loadCloudActivities(
  userId: string
): Promise<FocusSessionActivity[]> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error || !data) return [];

    return data.map((s) => ({
      id: s.id,
      type: "focus_session" as const,
      title: s.title,
      description: s.description ?? undefined,
      durationMs: s.duration_ms,
      category: s.category as FocusSessionActivity["category"],
      visibility: s.visibility as FocusSessionActivity["visibility"],
      startedAt: new Date(s.started_at).getTime(),
      endedAt: new Date(s.ended_at).getTime(),
      createdAt: new Date(s.created_at).getTime(),
      timezoneOffset: s.tz_offset ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function syncLocalToCloud(userId: string): Promise<number> {
  const local = await loadActivities();
  const focusSessions = local.filter(
    (a): a is FocusSessionActivity => a.type === "focus_session"
  );

  if (focusSessions.length === 0) return 0;

  let synced = 0;
  for (const session of focusSessions) {
    try {
      await saveActivityToCloud(session, userId);
      synced++;
    } catch {
      // Continue with other sessions
    }
  }
  return synced;
}

export async function deleteActivityFromCloud(id: string): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("sessions").delete().eq("id", id);
  } catch (err) {
    console.error("[CloudSync] Failed to delete activity:", err);
  }
}

export async function updateActivityInCloud(
  id: string,
  updates: Partial<Pick<FocusSessionActivity, "title" | "category" | "visibility" | "description">>
): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    
    // Dynamically build payload to avoid setting omitted fields to undefined -> null
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.description !== undefined) payload.description = updates.description || null;
    
    if (Object.keys(payload).length === 0) return;

    await supabase
      .from("sessions")
      .update(payload)
      .eq("id", id);
  } catch (err) {
    console.error("[CloudSync] Failed to update activity:", err);
  }
}

export async function loadActiveTimer(): Promise<ActiveTimer | null> {
  const ok = await ensureDb();
  if (ok) {
    const row = await idbGet<{ key: string; value: ActiveTimer }>("kv", "activeTimer");
    if (row?.value) return row.value;
  }
  return lsGetKv<ActiveTimer | null>("activeTimer", null);
}

export async function saveActiveTimer(timer: ActiveTimer | null): Promise<void> {
  lsSetKv("activeTimer", timer);
  const ok = await ensureDb();
  if (!ok) return;
  if (timer) {
    await idbPut("kv", { key: "activeTimer", value: timer });
  } else {
    await idbDelete("kv", "activeTimer");
  }
}

export async function loadMusicSettings(): Promise<MusicSettings> {
  const ok = await ensureDb();
  if (ok) {
    const row = await idbGet<{ key: string; value: MusicSettings }>("kv", "music");
    if (row?.value) return row.value;
  }
  return lsGetKv("music", defaultMusic);
}

export async function saveMusicSettings(settings: MusicSettings): Promise<void> {
  lsSetKv("music", settings);
  const ok = await ensureDb();
  if (!ok) return;
  await idbPut("kv", { key: "music", value: settings });
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const ok = await ensureDb();
  if (ok) {
    const row = await idbGet<{ key: string; value: UserPreferences }>("kv", "preferences");
    if (row?.value) return row.value;
  }
  return lsGetKv("preferences", defaultPreferences);
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  lsSetKv("preferences", preferences);
  const ok = await ensureDb();
  if (!ok) return;
  await idbPut("kv", { key: "preferences", value: preferences });
}

interface UploadRow extends UploadedTrack {
  blob: Blob;
}

export async function loadUploads(): Promise<UploadedTrack[]> {
  const ok = await ensureDb();
  if (!ok) return [];
  const rows = await idbGetAll<UploadRow>("uploads");
  return rows
    .map(({ id, name, mimeType, createdAt }) => ({ id, name, mimeType, createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveUpload(
  track: UploadedTrack,
  blob: Blob
): Promise<void> {
  const ok = await ensureDb();
  if (!ok) throw new Error("Uploads need IndexedDB, which is not available here.");
  await idbPut("uploads", { ...track, blob });
}

export async function getUploadBlob(id: string): Promise<Blob | null> {
  const ok = await ensureDb();
  if (!ok) return null;
  const row = await idbGet<UploadRow>("uploads", id);
  return row?.blob ?? null;
}

export async function deleteUpload(id: string): Promise<void> {
  const ok = await ensureDb();
  if (!ok) return;
  await idbDelete("uploads", id);
}

export async function renameUpload(id: string, name: string): Promise<void> {
  const ok = await ensureDb();
  if (!ok) return;
  const row = await idbGet<UploadRow>("uploads", id);
  if (!row) return;
  await idbPut("uploads", { ...row, name });
}
