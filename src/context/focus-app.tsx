"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Activity,
  FocusSessionActivity,
  SessionCategory,
  SessionVisibility,
  ActiveTimer,
  MusicSettings,
  UploadedTrack,
  UserPreferences,
} from "@/types";
import { DEFAULT_DAILY_GOAL_MINUTES, DEFAULT_SESSION_GOAL_MINUTES } from "@/types";
import {
  loadActivities,
  saveActivity,
  updateActivity as updateActivityStorage,
  deleteActivity,
  loadActiveTimer,
  saveActiveTimer,
  loadMusicSettings,
  saveMusicSettings,
  loadUserPreferences,
  saveUserPreferences,
  loadUploads,
  saveUpload,
  getUploadBlob,
  deleteUpload,
  renameUpload,
  saveActivityToCloud,
  deleteActivityFromCloud,
  updateActivityInCloud,
  loadCloudActivities,
  syncLocalToCloud,
  persistActivities,
} from "@/lib/storage";
import { useAuth } from "@/context/auth-context";
import { computeElapsedMs, todayActivities, todayTotalMs, historyDays } from "@/lib/time";
import { sanitizeLabel, sanitizeFileName, isValidAudioMime, MAX_UPLOAD_BYTES } from "@/lib/sanitize";
import {
  findTrack,
  mergeTracks,
  revokeObjectUrl,
  type PlayableTrack,
} from "@/lib/audio";

type LoadState = "loading" | "ready" | "error";

interface PendingStop {
  durationMs: number;
  startedAt: number;
  endedAt: number;
  timerSnapshot: ActiveTimer;
}

interface FocusState {
  loadState: LoadState;
  loadError: string | null;
  activities: Activity[];
  activeTimer: ActiveTimer | null;
  showRecovery: boolean;
  pendingStop: PendingStop | null;
  musicSettings: MusicSettings;
  uploads: UploadedTrack[];
  tracks: PlayableTrack[];
  currentTrack: PlayableTrack | null;
  isPlaying: boolean;
  playbackError: string | null;
  uploadObjectUrl: string | null;
}

interface FocusActions {
  retryLoad: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  requestStop: () => void;
  confirmStop: (title: string, category: SessionCategory, visibility: SessionVisibility, description?: string) => Promise<void>;
  cancelStop: () => void;
  discardSession: () => void;
  keepRecovery: () => void;
  discardRecovery: () => void;
  updateActivity: (id: string, updates: Partial<Pick<FocusSessionActivity, "title" | "category" | "visibility" | "description">>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  selectTrack: (id: string) => void;
  togglePlay: () => void;
  uploadAudio: (file: File) => Promise<string | null>;
  renameUploadedTrack: (id: string, name: string) => Promise<void>;
  deleteUploadedTrack: (id: string) => Promise<void>;
  elapsedMs: number;
  isRunning: boolean;
  isPaused: boolean;
  todayList: FocusSessionActivity[];
  todayTotal: number;
  history: ReturnType<typeof historyDays>;
  dailyGoalMinutes: number;
  setDailyGoalMinutes: (minutes: number) => void;
  sessionGoalMinutes: number;
  setSessionGoalMinutes: (minutes: number) => void;
  plannedCategory: SessionCategory;
  setPlannedCategory: (category: SessionCategory) => void;
  showMilliseconds: boolean;
  setShowMilliseconds: (show: boolean) => void;
  timerDirection: 'up' | 'down';
  setTimerDirection: (dir: 'up' | 'down') => void;
  joinedAt?: number;
}

const FocusContext = createContext<(FocusState & FocusActions) | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingStop, setPendingStop] = useState<PendingStop | null>(null);
  const [musicSettings, setMusicSettings] = useState<MusicSettings>({
    volume: 0.6,
    loop: true,
    lastTrackId: null,
  });
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
    sessionGoalMinutes: DEFAULT_SESSION_GOAL_MINUTES,
    showMilliseconds: true,
    timerDirection: 'up',
  });
  const [plannedCategory, setPlannedCategory] = useState<SessionCategory>("studying");
  const [uploads, setUploads] = useState<UploadedTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [uploadObjectUrl, setUploadObjectUrl] = useState<string | null>(null);
  const [, tick] = useReducer((n: number) => n + 1, 0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tracks = useMemo(() => mergeTracks(uploads), [uploads]);
  const currentTrack = useMemo(
    () => findTrack(tracks, musicSettings.lastTrackId),
    [tracks, musicSettings.lastTrackId]
  );

  const boot = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const [loadedActivities, savedTimer, music, loadedUploads] = await Promise.all([
        loadActivities(),
        loadActiveTimer(),
        loadMusicSettings(),
        loadUploads(),
      ]);
      const prefs = await loadUserPreferences();
      
      // Ensure joinedAt is populated from existing activities if missing
      if (!prefs.joinedAt) {
        const earliest = loadedActivities.length > 0 
          ? Math.min(...loadedActivities.map((a: Activity) => a.startedAt))
          : Date.now();
        prefs.joinedAt = earliest;
        await saveUserPreferences(prefs);
      }
      
      setActivities(loadedActivities);
      setMusicSettings(music);
      setUploads(loadedUploads);
      setUserPreferences(prefs);
      if (savedTimer) {
        setActiveTimer(savedTimer);
        setShowRecovery(true);
      }
      setLoadState("ready");
    } catch {
      setLoadError("Could not load your saved data. Try again.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // Sync cloud sessions down to local
  useEffect(() => {
    if (!user || isGuest) return;
    let mounted = true;

    const fetchCloud = async () => {
      const cloudSessions = await loadCloudActivities(user.id);
      if (!mounted || cloudSessions.length === 0) return;

      setActivities((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        let changed = false;
        for (const cs of cloudSessions) {
          if (!map.has(cs.id)) {
            map.set(cs.id, cs);
            changed = true;
          }
        }
        if (!changed) return prev;
        const next = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        // Persist the merged list locally
        persistActivities(next).catch(() => {});
        return next;
      });
    };

    fetchCloud();
    return () => {
      mounted = false;
    };
  }, [user, isGuest]);

  const elapsedMs = activeTimer
    ? computeElapsedMs(
        activeTimer.startedAt,
        activeTimer.accumulatedMs,
        activeTimer.isPaused
      )
    : 0;

  const isRunning = !!activeTimer;
  const isPaused = activeTimer?.isPaused ?? false;

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return;
    const id = window.setInterval(() => tick(), 50);
    return () => clearInterval(id);
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) return;
    saveActiveTimer(activeTimer);
  }, [activeTimer]);

  const persistMusic = useCallback(async (next: MusicSettings) => {
    setMusicSettings(next);
    await saveMusicSettings(next);
  }, []);

  const updatePref = useCallback((partial: Partial<UserPreferences>) => {
    setUserPreferences(prev => {
      const next = { ...prev, ...partial };
      void saveUserPreferences(next);
      return next;
    });
  }, []);

  const setDailyGoalMinutes = useCallback((minutes: number) => updatePref({ dailyGoalMinutes: minutes }), [updatePref]);
  const setSessionGoalMinutes = useCallback((minutes: number) => updatePref({ sessionGoalMinutes: minutes }), [updatePref]);
  const setShowMilliseconds = useCallback((show: boolean) => updatePref({ showMilliseconds: show }), [updatePref]);
  const setTimerDirection = useCallback((dir: 'up' | 'down') => updatePref({ timerDirection: dir }), [updatePref]);

  const startTimer = useCallback(() => {
    if (activeTimer) return;
    const timer: ActiveTimer = {
      startedAt: Date.now(),
      accumulatedMs: 0,
      isPaused: false,
      pausedAt: null,
      label: "",
    };
    setActiveTimer(timer);
    setShowRecovery(false);
  }, [activeTimer]);

  const pauseTimer = useCallback(() => {
    if (!activeTimer || activeTimer.isPaused) return;
    const elapsed = computeElapsedMs(
      activeTimer.startedAt,
      activeTimer.accumulatedMs,
      false
    );
    setActiveTimer({
      ...activeTimer,
      isPaused: true,
      pausedAt: Date.now(),
      accumulatedMs: elapsed,
    });
  }, [activeTimer]);

  const resumeTimer = useCallback(() => {
    if (!activeTimer || !activeTimer.isPaused) return;
    setActiveTimer({
      ...activeTimer,
      isPaused: false,
      pausedAt: null,
      startedAt: Date.now(),
    });
  }, [activeTimer]);

  const requestStop = useCallback(() => {
    if (!activeTimer) return;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {}
    const endedAt = Date.now();
    const durationMs = computeElapsedMs(
      activeTimer.startedAt,
      activeTimer.accumulatedMs,
      activeTimer.isPaused
    );
    if (durationMs < 1000) {
      setActiveTimer(null);
      saveActiveTimer(null);
      return;
    }
    setPendingStop({
      durationMs,
      startedAt: endedAt - durationMs,
      endedAt,
      timerSnapshot: activeTimer,
    });
    setActiveTimer(null);
    saveActiveTimer(null);
  }, [activeTimer]);

  const confirmStop = useCallback(
    async (title: string, category: SessionCategory, visibility: SessionVisibility, description?: string) => {
      if (!pendingStop) return;
      const activity: FocusSessionActivity = {
        id: newId(),
        type: 'focus_session',
        createdAt: Date.now(),
        startedAt: pendingStop.startedAt,
        endedAt: pendingStop.endedAt,
        durationMs: pendingStop.durationMs,
        title: sanitizeLabel(title) || 'Focus Session',
        description: description?.trim() || undefined,
        category,
        visibility,
        timezoneOffset: new Date().getTimezoneOffset(),
      };
      const next = await saveActivity(activity);
      setActivities(next);
      setPendingStop(null);

      // Cloud sync
      if (user) {
        saveActivityToCloud(activity, user.id).catch(() => {});
      }
    },
    [pendingStop, user]
  );

  const cancelStop = useCallback(() => {
    if (pendingStop?.timerSnapshot) {
      const snap = pendingStop.timerSnapshot;
      if (snap.isPaused) {
        setActiveTimer(snap);
      } else {
        setActiveTimer({
          ...snap,
          startedAt: Date.now(),
        });
      }
    }
    setPendingStop(null);
  }, [pendingStop]);

  const discardSession = useCallback(() => {
    setPendingStop(null);
    setActiveTimer(null);
    saveActiveTimer(null);
  }, []);

  const keepRecovery = useCallback(() => {
    setShowRecovery(false);
  }, []);

  const discardRecovery = useCallback(() => {
    setActiveTimer(null);
    saveActiveTimer(null);
    setShowRecovery(false);
  }, []);

  const updateActivity = useCallback(async (id: string, updates: Partial<Pick<FocusSessionActivity, "title" | "category" | "visibility" | "description">>) => {
    if (updates.title !== undefined) updates.title = sanitizeLabel(updates.title);
    if (updates.description !== undefined) {
      updates.description = updates.description.trim() || undefined;
    }
    const next = await updateActivityStorage(id, updates);
    setActivities(next);

    // Cloud sync
    if (user) {
      updateActivityInCloud(id, updates).catch(() => {});
    }
  }, [user]);

  const removeActivity = useCallback(async (id: string) => {
    const next = await deleteActivity(id);
    setActivities(next);

    // Cloud sync
    if (user) {
      deleteActivityFromCloud(id).catch(() => {});
    }
  }, [user]);

  const resolveTrackSrc = useCallback(
    async (track: PlayableTrack): Promise<string | null> => {
      if (track.kind === "bundled") return track.src;
      const blob = await getUploadBlob(track.id);
      if (!blob) return null;
      revokeObjectUrl(uploadObjectUrl);
      const url = URL.createObjectURL(blob);
      setUploadObjectUrl(url);
      return url;
    },
    [uploadObjectUrl]
  );

  const selectTrack = useCallback(
    async (id: string) => {
      const track = findTrack(tracks, id);
      if (!track) return;
      setPlaybackError(null);
      await persistMusic({ ...musicSettings, lastTrackId: id });
      if (audioRef.current) {
        const src = await resolveTrackSrc(track);
        if (!src) {
          setPlaybackError("That track could not be loaded.");
          return;
        }
        audioRef.current.src = src;
        if (isPlaying) void audioRef.current.play().catch(() => {
          setPlaybackError("Playback failed. Pick another track.");
          setIsPlaying(false);
        });
      }
    },
    [tracks, musicSettings, persistMusic, resolveTrackSrc, isPlaying]
  );

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    setPlaybackError(null);
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }
    if (!el.src) {
      const src = await resolveTrackSrc(currentTrack);
      if (!src) {
        setPlaybackError("That track could not be loaded.");
        return;
      }
      el.src = src;
    }
    el.loop = musicSettings.loop;
    el.volume = musicSettings.volume;
    void el.play().catch(() => {
      setPlaybackError("Playback failed. Check the file or pick another track.");
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [currentTrack, isPlaying, musicSettings, resolveTrackSrc]);

  const setVolume = useCallback(
    (v: number) => {
      const volume = Math.min(1, Math.max(0, v));
      if (audioRef.current) audioRef.current.volume = volume;
      void persistMusic({ ...musicSettings, volume });
    },
    [musicSettings, persistMusic]
  );

  const toggleLoop = useCallback(() => {
    const loop = !musicSettings.loop;
    if (audioRef.current) audioRef.current.loop = loop;
    void persistMusic({ ...musicSettings, loop });
  }, [musicSettings, persistMusic]);

  const uploadAudio = useCallback(async (file: File): Promise<string | null> => {
    if (!isValidAudioMime(file.type)) {
      return "Use MP3, OGG, or WAV files only.";
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return "File is too large. Maximum size is 20 MB.";
    }
    try {
      const track: UploadedTrack = {
        id: newId(),
        name: sanitizeFileName(file.name.replace(/\.[^.]+$/, "")),
        mimeType: file.type,
        createdAt: Date.now(),
      };
      await saveUpload(track, file);
      const list = await loadUploads();
      setUploads(list);
      return null;
    } catch {
      return "Upload failed. IndexedDB may be unavailable in this browser.";
    }
  }, []);

  const renameUploadedTrack = useCallback(async (id: string, name: string) => {
    await renameUpload(id, sanitizeFileName(name));
    setUploads(await loadUploads());
  }, []);

  const deleteUploadedTrack = useCallback(
    async (id: string) => {
      await deleteUpload(id);
      setUploads(await loadUploads());
      if (musicSettings.lastTrackId === id) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
          setIsPlaying(false);
        }
        await persistMusic({ ...musicSettings, lastTrackId: null });
      }
    },
    [musicSettings, persistMusic]
  );
  
  const focusSessions = useMemo(() => {
    return activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  }, [activities]);

  const value: FocusState & FocusActions = {
    loadState,
    loadError,
    activities,
    activeTimer,
    showRecovery,
    pendingStop,
    musicSettings,
    uploads,
    tracks,
    currentTrack,
    isPlaying,
    playbackError,
    uploadObjectUrl,
    retryLoad: boot,
    startTimer,
    pauseTimer,
    resumeTimer,
    requestStop,
    confirmStop,
    cancelStop,
    discardSession,
    keepRecovery,
    discardRecovery,
    updateActivity,
    removeActivity,
    setVolume,
    toggleLoop,
    selectTrack,
    togglePlay,
    uploadAudio,
    renameUploadedTrack,
    deleteUploadedTrack,
    elapsedMs,
    isRunning,
    isPaused,
    todayList: todayActivities(focusSessions),
    todayTotal: todayTotalMs(focusSessions),
    history: historyDays(focusSessions),
    dailyGoalMinutes: userPreferences.dailyGoalMinutes,
    setDailyGoalMinutes,
    sessionGoalMinutes: userPreferences.sessionGoalMinutes,
    setSessionGoalMinutes,
    plannedCategory,
    setPlannedCategory,
    showMilliseconds: userPreferences.showMilliseconds ?? true,
    setShowMilliseconds,
    timerDirection: userPreferences.timerDirection ?? 'up',
    setTimerDirection,
    joinedAt: userPreferences.joinedAt,
  };

  return (
    <FocusContext.Provider value={value}>
      <audio ref={audioRef} className="hidden" preload="none" />
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus(): FocusState & FocusActions {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}

