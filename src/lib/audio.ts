import { bundledTracks } from "@/config/tracks";
import type { BundledTrack, UploadedTrack } from "@/types";

export type PlayableTrack =
  | (BundledTrack & { kind: "bundled" })
  | (UploadedTrack & { kind: "upload" });

export function listBundled(): PlayableTrack[] {
  return bundledTracks.map((t) => ({ ...t, kind: "bundled" as const }));
}

export function mergeTracks(uploads: UploadedTrack[]): PlayableTrack[] {
  return [...listBundled(), ...uploads.map((u) => ({ ...u, kind: "upload" as const }))];
}

export function findTrack(
  tracks: PlayableTrack[],
  id: string | null
): PlayableTrack | null {
  if (!id) return tracks[0] ?? null;
  return tracks.find((t) => t.id === id) ?? tracks[0] ?? null;
}

export function revokeObjectUrl(url: string | null): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
