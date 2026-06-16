import type { BundledTrack } from "@/types";

// To add a bundled track:
// 1. Drop an .mp3 or .ogg file into /public/audio/
// 2. Add an entry below with a display name and the file path

export const bundledTracks: BundledTrack[] = [
  { id: "rain", name: "Soft Rain", src: "/audio/rain.mp3" },
  { id: "fireplace", name: "Fireplace", src: "/audio/fireplace.mp3" },
  { id: "piano", name: "Quiet Piano", src: "/audio/piano.mp3" },
];
