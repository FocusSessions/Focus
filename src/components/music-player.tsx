"use client";

import { useState } from "react";
import { useFocus } from "@/context/focus-app";
import { UploadDialog } from "@/components/upload-dialog";
import { Pause, Play, Repeat, Plus } from "lucide-react";

export function MusicPlayer() {
  const {
    tracks,
    currentTrack,
    isPlaying,
    musicSettings,
    playbackError,
    togglePlay,
    setVolume,
    toggleLoop,
    selectTrack,
    isRunning,
  } = useFocus();

  const [showUpload, setShowUpload] = useState(false);

  if (isRunning) return null;

  return (
    <>
      <footer
        className="fixed bottom-16 left-0 right-0 md:bottom-0 md:left-44 z-30 border-t border-border bg-surface/90 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.4)]"
        aria-label="Music player"
      >
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-4 py-2 sm:py-3">
          {playbackError && (
            <p className="text-xs text-terracotta mb-2" role="status">
              {playbackError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                className="btn-primary shrink-0 p-2 sm:p-2.5"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? "Pause music" : "Play music"}
                disabled={!currentTrack}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="track-select">
                  Choose track
                </label>
                <select
                  id="track-select"
                  className="input py-1 sm:py-1.5 text-xs sm:text-sm"
                  value={currentTrack?.id ?? ""}
                  onChange={(e) => void selectTrack(e.target.value)}
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.kind === "upload" ? " (yours)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`btn-ghost shrink-0 p-1.5 sm:p-2 ${musicSettings.loop ? "text-terracotta" : ""}`}
                onClick={toggleLoop}
                aria-label={musicSettings.loop ? "Loop on" : "Loop off"}
                aria-pressed={musicSettings.loop}
              >
                <Repeat className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="btn-ghost shrink-0 p-1.5 sm:p-2"
                onClick={() => setShowUpload(true)}
                aria-label="Add your own track"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 w-32 shrink-0">
              <label className="sr-only" htmlFor="volume">
                Volume
              </label>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brown-muted">Vol</span>
              <input
                id="volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(musicSettings.volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="h-1 flex-1 accent-terracotta"
              />
            </div>
          </div>
        </div>
      </footer>

      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
    </>
  );
}
