"use client";

import type { ProfileViewMode } from "@/types/analytics";
import { Grid3x3, TrendingUp } from "lucide-react";

interface ViewToggleProps {
  mode: ProfileViewMode;
  onChange: (mode: ProfileViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 rounded-cozy bg-cream p-1">
      <button
        type="button"
        className={`flex flex-1 items-center justify-center gap-2 rounded-cozy px-4 py-2.5 text-sm font-medium transition-all duration-cozy ${
          mode === "heatmap"
            ? "bg-surface text-brown shadow-sm"
            : "text-brown-muted hover:text-brown"
        }`}
        onClick={() => onChange("heatmap")}
        aria-pressed={mode === "heatmap"}
      >
        <Grid3x3 className="h-4 w-4" />
        Activity
      </button>
      <button
        type="button"
        className={`flex flex-1 items-center justify-center gap-2 rounded-cozy px-4 py-2.5 text-sm font-medium transition-all duration-cozy ${
          mode === "charts"
            ? "bg-surface text-brown shadow-sm"
            : "text-brown-muted hover:text-brown"
        }`}
        onClick={() => onChange("charts")}
        aria-pressed={mode === "charts"}
      >
        <TrendingUp className="h-4 w-4" />
        Progress
      </button>
    </div>
  );
}
