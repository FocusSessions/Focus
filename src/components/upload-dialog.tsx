"use client";

import { useRef, useState } from "react";
import { useFocus } from "@/context/focus-app";
import { Trash2, Pencil } from "lucide-react";

interface UploadDialogProps {
  onClose: () => void;
}

export function UploadDialog({ onClose }: UploadDialogProps) {
  const { uploads, uploadAudio, renameUploadedTrack, deleteUploadedTrack } = useFocus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const msg = await uploadAudio(file);
    setUploading(false);
    if (msg) setError(msg);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
    >
      <div 
        className="absolute inset-0 bg-brown/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="card relative z-10 max-h-[80vh] w-full max-w-sm overflow-y-auto p-6 animate-zoom-in">
        <h2 id="upload-title" className="font-serif text-xl">
          Your tracks
        </h2>
        <p className="mt-1 text-sm text-brown-muted">
          MP3, OGG, or WAV up to 20 MB. Stored on this device only.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/ogg,audio/wav,audio/mp3"
          className="sr-only"
          aria-label="Select audio file to upload"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Add your own"}
        </button>

        {error && (
          <p className="mt-2 text-sm text-terracotta" role="status">
            {error}
          </p>
        )}

        {uploads.length > 0 && (
          <ul className="mt-4 space-y-2">
            {uploads.map((track) => (
              <li
                key={track.id}
                className="flex items-center justify-between gap-2 rounded-cozy border border-border px-3 py-2"
              >
                {renameId === track.id ? (
                  <input
                    name="rename-track"
                    aria-label="Rename track"
                    autoComplete="off"
                    className="input py-1 text-sm"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void renameUploadedTrack(track.id, renameDraft);
                        setRenameId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="truncate text-sm text-brown">{track.name}</span>
                )}
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn-ghost p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-md"
                    aria-label="Rename track"
                    onClick={() => {
                      setRenameId(track.id);
                      setRenameDraft(track.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-md"
                    aria-label="Delete track"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this track?")) {
                        void deleteUploadedTrack(track.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn-secondary mt-5 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
