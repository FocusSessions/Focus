"use client";

import { useEffect, useState, useCallback } from "react";
import { useFocus } from "@/context/focus-app";
import { formatDurationShort } from "@/lib/time";
import type { SessionCategory, SessionVisibility } from "@/types";

export function StopDialog() {
  const { pendingStop, confirmStop, cancelStop, discardSession, plannedCategory } = useFocus();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SessionCategory>(plannedCategory);
  const [visibility, setVisibility] = useState<SessionVisibility>("private");
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (pendingStop) {
      setCategory(plannedCategory);
      setShowConfirmCancel(false);
    }
  }, [pendingStop, plannedCategory]);



  const handleSave = useCallback(() => {
    void confirmStop(title, category, visibility, description);
    setTitle("");
    setDescription("");
    setCategory(plannedCategory);
    setVisibility("private");
    setShowConfirmCancel(false);
    setShowAdvanced(false);
  }, [confirmStop, title, category, visibility, description, plannedCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    if (pendingStop) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [pendingStop, handleSave]);
  if (!pendingStop) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brown/30 sm:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-dialog-title"
    >
      <div className="card w-full max-w-sm rounded-t-3xl sm:rounded-cozy p-6 max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-zoom-in">
        <h2 id="stop-dialog-title" className="font-serif text-2xl text-center">
          Session Complete
        </h2>
        <p className="mt-1 text-center font-medium text-terracotta">
          {formatDurationShort(pendingStop.durationMs)} focused
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-brown-muted" htmlFor="session-description">
            What did you accomplish?
          </label>
          <textarea
            id="session-description"
            name="description"
            className="input mt-1.5 min-h-[80px] w-full resize-none bg-surface"
            value={description}
            maxLength={200}
            placeholder="Finished chapter 3, solved two problems…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {!showAdvanced ? (
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center py-2 text-xs font-medium text-brown-muted hover:text-brown transition-colors"
            onClick={() => setShowAdvanced(true)}
          >
            + Advanced Options
          </button>
        ) : (
          <div className="mt-4 space-y-4 animate-fade-in border-t border-border/50 pt-4">
            <div>
              <label className="block text-sm text-brown-muted" htmlFor="session-title">
                Session Name (Optional)
              </label>
              <input
                id="session-title"
                name="title"
                autoComplete="off"
                className="input mt-1.5 w-full bg-surface"
                value={title}
                maxLength={50}
                placeholder="Operating Systems, LeetCode…"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            <div>
              <label className="block text-sm text-brown-muted">Category</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {['Work', 'Study', 'Coding', 'Reading', 'Gaming'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`rounded-full px-3 py-1 text-[11px] font-medium border transition-colors ${category.toLowerCase() === c.toLowerCase() ? 'bg-terracotta text-white border-terracotta' : 'bg-surface text-brown-muted border-border hover:bg-brown/5'}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-brown-muted" htmlFor="session-visibility">
                Visibility
              </label>
              <select
                id="session-visibility"
                className="input mt-1.5 w-full bg-surface"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as SessionVisibility)}
              >
                <option value="private">Private</option>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className="btn-primary w-full py-2.5 text-base" onClick={handleSave}>
            Save Session
          </button>
          
          {!showConfirmCancel ? (
            <div className="flex justify-between items-center px-1">
              <button type="button" className="text-sm font-medium text-brown-muted hover:text-brown transition-colors" onClick={cancelStop}>
                Resume Timer
              </button>
              <button type="button" className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors" onClick={() => setShowConfirmCancel(true)}>
                Discard Session
              </button>
            </div>
          ) : (
            <div className="mt-1 text-center bg-red-500/5 p-3 rounded-xl border border-red-500/20 animate-zoom-in">
              <p className="text-xs text-red-600 mb-3 font-medium">Discard this session?</p>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost flex-1 text-brown-muted bg-surface hover:bg-surface-dark text-xs py-1.5" onClick={() => setShowConfirmCancel(false)}>
                  Keep it
                </button>
                <button type="button" className="btn-primary flex-1 bg-red-500 hover:bg-red-600 text-xs border-none py-1.5" onClick={discardSession}>
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
