"use client";

import { useState } from "react";
import type { FocusSessionActivity, SessionCategory, SessionVisibility } from "@/types";
import { formatDurationShort, formatTimeRange } from "@/lib/time";
import { useFocus } from "@/context/focus-app";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface SessionListProps {
  activities: FocusSessionActivity[];
  emptyMessage: string;
  emptyHint?: string;
}

export function SessionList({ activities, emptyMessage, emptyHint }: SessionListProps) {
  const { updateActivity, removeActivity } = useFocus();

  if (activities.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-medium text-brown">{emptyMessage}</p>
        {emptyHint && <p className="mt-2 text-sm text-brown-muted">{emptyHint}</p>}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Session list">
      {activities.map((activity) => (
        <SessionRow
          key={activity.id}
          activity={activity}
          onUpdate={updateActivity}
          onDelete={removeActivity}
        />
      ))}
    </ul>
  );
}

const categoryColors: Record<string, string> = {
  work: "bg-info/10 text-info dark:bg-info/20",
  study: "bg-success/10 text-success dark:bg-success/20",
  coding: "bg-terracotta/10 text-terracotta dark:bg-terracotta/20",
  reading: "bg-warning/10 text-warning dark:bg-warning/20",
  writing: "bg-sage/10 text-sage dark:bg-sage/20",
  other: "bg-brown-muted/10 text-brown dark:bg-brown-muted/20 dark:text-brown-muted",
};

function SessionRow({
  activity,
  onUpdate,
  onDelete,
}: {
  activity: FocusSessionActivity;
  onUpdate: (
    id: string,
    updates: Partial<Pick<FocusSessionActivity, "title" | "category" | "visibility" | "description">>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(activity.title);
  const [draftDescription, setDraftDescription] = useState(activity.description ?? "");
  const [draftCategory, setDraftCategory] = useState<SessionCategory>(activity.category || "other");
  const [draftVisibility, setDraftVisibility] = useState<SessionVisibility>(
    activity.visibility || "private"
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveUpdates = async () => {
    if (!draftTitle.trim()) return;
    await onUpdate(activity.id, {
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      category: draftCategory,
      visibility: activity.visibility, // Keep existing visibility
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(activity.id);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftTitle(activity.title);
    setDraftDescription(activity.description ?? "");
    setDraftCategory(activity.category || "other");
  };

  return (
    <li className="group card rounded-cozy px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-4 w-full bg-surface-dark/10 p-5 rounded-xl border border-border/40 animate-fade-in shadow-sm">
              <div>
                <label className="block text-[13px] font-medium text-brown-muted mb-1.5">
                  Session Name
                </label>
                <input
                  className="input w-full bg-surface font-medium transition-shadow focus:ring-2 focus:ring-terracotta/20"
                  value={draftTitle}
                  maxLength={50}
                  placeholder="e.g. Deep Work"
                  onChange={(e) => setDraftTitle(e.target.value)}
                  aria-label="Session title"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-brown-muted mb-1.5">
                  Description
                </label>
                <textarea
                  className="input min-h-[100px] w-full resize-y bg-surface text-[14px] leading-relaxed transition-shadow focus:ring-2 focus:ring-terracotta/20"
                  value={draftDescription}
                  maxLength={200}
                  placeholder="What did you accomplish?"
                  onChange={(e) => setDraftDescription(e.target.value)}
                  aria-label="Session description"
                />
                <p className="mt-1.5 text-right text-[11px] text-brown-muted/60 font-medium">{draftDescription.length}/200</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-brown-muted mb-1.5">
                  Category
                </label>
                <input
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  placeholder="e.g. Coding"
                  list="edit-category-suggestions"
                  maxLength={30}
                  className="input w-full sm:w-1/2 bg-surface px-3 py-2 text-[13px] transition-shadow focus:ring-2 focus:ring-terracotta/20"
                />
                <datalist id="edit-category-suggestions">
                  <option value="Work" />
                  <option value="Study" />
                  <option value="Coding" />
                  <option value="Reading" />
                  <option value="Gaming" />
                </datalist>
              </div>

              <div className="mt-2 flex justify-end gap-3 pt-2 border-t border-border/40">
                <button type="button" className="btn-ghost px-5 py-2 text-[13px] font-medium hover:bg-brown/5 text-brown-muted" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" disabled={!draftTitle.trim()} className="btn-primary px-6 py-2 text-[13px] font-medium disabled:opacity-50 transition-opacity flex items-center gap-2" onClick={saveUpdates}>
                  <Check className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-brown">
                  {activity.title || "Untitled Session"}
                </p>
                <span className={`rounded-cozy px-1.5 py-0.5 text-xs capitalize ${categoryColors[(activity.category || "other").toLowerCase()] || categoryColors.other}`}>
                  {activity.category || "other"}
                </span>
              </div>
              {activity.description && (
                <p className="mt-1 text-sm text-brown-muted line-clamp-2">{activity.description}</p>
              )}
              <p className="mt-1 text-sm text-brown-muted">
                {formatTimeRange(activity.startedAt, activity.endedAt)}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-medium tabular-nums text-sage">
              {formatDurationShort(activity.durationMs)}
            </span>
            <button
              type="button"
              className="btn-ghost p-2 opacity-0 transition-opacity duration-cozy group-hover:opacity-100"
              onClick={() => setEditing(true)}
              aria-label="Edit session"
            >
              <Pencil className="h-3.5 w-3.5 text-brown-muted" />
            </button>
            <button
              type="button"
              className={`btn-ghost p-2 opacity-0 transition-opacity duration-cozy group-hover:opacity-100 ${confirmDelete ? "opacity-100 text-terracotta" : ""}`}
              onClick={handleDelete}
              onBlur={() => setTimeout(() => setConfirmDelete(false), 150)}
              aria-label={confirmDelete ? "Confirm delete" : "Delete session"}
            >
              <Trash2 className="h-3.5 w-3.5 text-brown-muted" />
            </button>
          </div>
        )}
      </div>
      {confirmDelete && !editing && (
        <p className="mt-2 text-right text-xs text-brown-muted">Tap delete again to confirm.</p>
      )}
    </li>
  );
}
