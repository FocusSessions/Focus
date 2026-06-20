"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (pendingStop) {
      setCategory(plannedCategory);
      setShowConfirmCancel(false);
    }
  }, [pendingStop, plannedCategory]);

  if (!pendingStop) return null;

  const handleSave = () => {
    void confirmStop(title, category, visibility, description);
    setTitle("");
    setDescription("");
    setCategory(plannedCategory);
    setVisibility("private");
    setShowConfirmCancel(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brown/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-dialog-title"
    >
      <div className="card w-full max-w-sm rounded-cozy p-6 animate-zoom-in">
        <h2 id="stop-dialog-title" className="font-serif text-xl">
          Session Complete
        </h2>
        <p className="mt-2 text-sm text-brown-muted">
          Duration: {formatDurationShort(pendingStop.durationMs)}
        </p>

        <label className="mt-4 block text-sm text-brown-muted" htmlFor="session-title">
          Session Name (Optional)
        </label>
        <input
          id="session-title"
          className="input mt-1 w-full"
          value={title}
          maxLength={50}
          placeholder="Operating Systems, LeetCode..."
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <label className="mt-4 block text-sm text-brown-muted" htmlFor="session-description">
          What did you accomplish?
        </label>
        <textarea
          id="session-description"
          className="input mt-1 min-h-[72px] w-full resize-none"
          value={description}
          maxLength={200}
          placeholder="Finished chapter 3, solved two problems..."
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="mt-4 block text-sm text-brown-muted" htmlFor="session-category">
          Category
        </label>
        <div className="mt-1">
          <input
            id="session-category"
            className="input w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Coding"
            list="category-suggestions"
            maxLength={30}
          />
          <datalist id="category-suggestions">
            <option value="Work" />
            <option value="Study" />
            <option value="Coding" />
            <option value="Reading" />
            <option value="Writing" />
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Work', 'Study', 'Coding', 'Reading'].map(c => (
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

        <label className="mt-4 block text-sm text-brown-muted" htmlFor="session-visibility">
          Visibility
        </label>
        <select
          id="session-visibility"
          className="input mt-1 w-full"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as SessionVisibility)}
        >
          <option value="private">Private</option>
          <option value="friends">Friends</option>
          <option value="public">Public</option>
        </select>

        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-primary flex-1" onClick={handleSave}>
            Save Session
          </button>
        </div>
        {!showConfirmCancel ? (
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={cancelStop}>
              Resume Timer
            </button>
            <button type="button" className="btn-ghost flex-1 text-terracotta hover:bg-terracotta/10" onClick={() => setShowConfirmCancel(true)}>
              Discard Session
            </button>
          </div>
        ) : (
          <div className="mt-2 text-center bg-terracotta/5 p-3 rounded-xl border border-terracotta/20 animate-zoom-in">
            <p className="text-xs text-terracotta mb-3 font-medium">Discard this session?</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1 text-brown-muted bg-surface hover:bg-surface-dark text-xs py-1.5" onClick={() => setShowConfirmCancel(false)}>
                Keep it
              </button>
              <button type="button" className="btn-primary flex-1 bg-terracotta hover:bg-terracotta-dark text-xs border-none py-1.5" onClick={discardSession}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
