"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { X, Save, AlertCircle } from "lucide-react";

interface EditProfileDialogProps {
  onClose: () => void;
}

export function EditProfileDialog({ onClose }: EditProfileDialogProps) {
  const { profile, setupProfile } = useAuth();
  
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      setError("Both username and display name are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: setupError } = await setupProfile(username.trim(), displayName.trim());
    
    setIsSubmitting(false);

    if (setupError) {
      setError(setupError);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="card relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-brown-muted hover:bg-surface hover:text-brown transition-colors"
          disabled={isSubmitting}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <h2 className="font-serif text-2xl font-medium text-brown mb-2">Set up your profile</h2>
          <p className="text-sm text-brown-muted mb-4">
            Choose your username and display name.
          </p>
          
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-orange-50 p-4 border border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/50">
            <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <strong className="block font-semibold mb-0.5">One-time setup</strong>
              Your username cannot be changed once saved. You can skip this for now and come back later.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-brown mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?…"
                className="input w-full"
                maxLength={50}
                required
                disabled={isSubmitting}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-brown mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. johndoe…"
                className="input w-full font-mono"
                maxLength={20}
                required
                disabled={isSubmitting}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-brown-muted mt-1.5">
                Only letters, numbers, and underscores are allowed. Max 20 characters.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-brown-muted hover:text-brown transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center justify-center gap-2 py-2 px-6"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
