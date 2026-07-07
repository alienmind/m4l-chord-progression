/**
 * scale.ts - modes and the key context that chord degrees are resolved against.
 */

import { mod12, type PitchClass } from "./pitch";

export type Mode =
	| "ionian"
	| "dorian"
	| "phrygian"
	| "lydian"
	| "mixolydian"
	| "aeolian"
	| "locrian";

export const MODES: Mode[] = [
	"ionian",
	"dorian",
	"phrygian",
	"lydian",
	"mixolydian",
	"aeolian",
	"locrian",
];

/** Semitone offsets from the tonic for the 7 diatonic degrees of each mode. */
export const MODE_INTERVALS: Record<Mode, number[]> = {
	ionian: [0, 2, 4, 5, 7, 9, 11],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	phrygian: [0, 1, 3, 5, 7, 8, 10],
	lydian: [0, 2, 4, 6, 7, 9, 11],
	mixolydian: [0, 2, 4, 5, 7, 9, 10],
	aeolian: [0, 2, 3, 5, 7, 8, 10],
	locrian: [0, 1, 3, 5, 6, 8, 10],
};

export interface KeyContext {
	root: PitchClass; // tonic pitch class 0..11
	mode: Mode;
}

/**
 * Pitch class of a scale degree (1..7) with an optional chromatic accidental.
 * degreePc({root:0, mode:"ionian"}, 5, 0) → 7 (G in C major)
 * degreePc({root:0, mode:"ionian"}, 7, -1) → 10 (bVII, Bb)
 */
export function degreePc(
	key: KeyContext,
	degree: number,
	accidental: number = 0,
): PitchClass {
	const idx = ((degree - 1) % 7 + 7) % 7;
	return mod12(key.root + MODE_INTERVALS[key.mode][idx] + accidental);
}

/** All 7 diatonic pitch classes of the key, tonic first. */
export function scalePitchClasses(key: KeyContext): PitchClass[] {
	return MODE_INTERVALS[key.mode].map((iv) => mod12(key.root + iv));
}

/**
 * Maps Ableton Live 12's scale_name string to one of our modes.
 * Live exposes many scales; we support the 7 diatonic modes and fall back to
 * null (caller keeps the current/manual mode) for exotic scales.
 */
export function liveScaleNameToMode(name: string): Mode | null {
	const n = name.trim().toLowerCase();
	const map: Record<string, Mode> = {
		major: "ionian",
		ionian: "ionian",
		minor: "aeolian",
		"natural minor": "aeolian",
		aeolian: "aeolian",
		dorian: "dorian",
		phrygian: "phrygian",
		lydian: "lydian",
		mixolydian: "mixolydian",
		locrian: "locrian",
	};
	return map[n] ?? null;
}

/** Human labels for the mode dropdown. */
export const MODE_LABELS: Record<Mode, string> = {
	ionian: "Ionian (Major)",
	dorian: "Dorian",
	phrygian: "Phrygian",
	lydian: "Lydian",
	mixolydian: "Mixolydian",
	aeolian: "Aeolian (Minor)",
	locrian: "Locrian",
};
