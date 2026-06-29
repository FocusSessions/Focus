"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFocus } from "@/context/focus-app";
import { formatDurationShort } from "@/lib/time";
import type { SessionCategory, SessionVisibility } from "@/types";
import { Plus, X } from "lucide-react";

const DEFAULT_CATEGORIES = ['Work', 'Study', 'Coding', 'Reading', 'Gaming'];

export function StopDialog() {
  const { pendingStop, confirmStop, cancelStop, discardSession, plannedCategory, customCategories, addCustomCategory } = useFocus();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SessionCategory>(plannedCategory);
  const [visibility, setVisibility] = useState<SessionVisibility>("public");
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

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
    setVisibility("public");
    setShowConfirmCancel(false);
    setShowCustomInput(false);
    setCustomCategoryInput("");
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

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  if (!pendingStop) return null;

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const handleAddCustom = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    // Don't duplicate
    if (!allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      addCustomCategory(trimmed);
    }
    setCategory(trimmed);
    setCustomCategoryInput("");
    setShowCustomInput(false);
  };

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

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-brown-muted mb-1.5" htmlFor="session-title">
              Session Name
            </label>
            <input
              id="session-title"
              name="title"
              autoComplete="off"
              className="input w-full bg-surface font-medium transition-shadow focus:ring-2 focus:ring-terracotta/20"
              value={title}
              maxLength={200}
              placeholder="e.g. Deep Work"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-brown-muted mb-1.5" htmlFor="session-description">
              Description
            </label>
            <textarea
              id="session-description"
              name="description"
              className="input min-h-[90px] w-full resize-y bg-surface text-[14px] leading-relaxed transition-shadow focus:ring-2 focus:ring-terracotta/20"
              value={description}
              maxLength={20000}
              placeholder="Finished chapter 3, solved two problems…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-border/50 pt-5">
          <div>
            <label className="block text-[13px] font-medium text-brown-muted mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 ${category.toLowerCase() === c.toLowerCase() ? 'bg-terracotta text-white border-terracotta' : 'bg-surface text-brown-muted border-border hover:bg-brown/5 hover:border-brown/20'}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}

              {/* Add custom category */}
              {showCustomInput ? (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustom();
                      if (e.key === "Escape") {
                        setShowCustomInput(false);
                        setCustomCategoryInput("");
                      }
                    }}
                    maxLength={20}
                    placeholder="e.g. Music"
                    className="input text-[12px] px-3 py-1.5 w-28 bg-surface rounded-full focus:ring-2 focus:ring-terracotta/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customCategoryInput.trim()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-sage text-white text-xs disabled:opacity-40 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                    aria-label="Save custom category"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCustomInput(false); setCustomCategoryInput(""); }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-brown-muted hover:text-brown hover:bg-brown/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-muted"
                    aria-label="Cancel custom category"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium border border-dashed border-border text-brown-muted hover:border-terracotta/50 hover:text-terracotta hover:bg-terracotta/5 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Custom
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button type="button" className="btn-primary w-full py-2.5 text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity" onClick={handleSave} disabled={!title.trim()}>
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
