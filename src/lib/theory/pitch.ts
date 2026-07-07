/**
 * pitch.ts - note names ↔ pitch classes ↔ MIDI numbers.
 *
 * Pitch class (pc) is an integer 0..11 with C = 0. Octave numbering follows the
 * "C4 = middle C = MIDI 60" convention (a.k.a. scientific / Ableton display).
 */

export type PitchClass = number; // 0..11

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const LETTER_PC: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

export function mod12(n: number): PitchClass {
	return ((n % 12) + 12) % 12;
}

/** 1 → "Db" (flats) or "C#" (sharps). */
export function pcToName(pc: PitchClass, preferFlats = true): string {
	const p = mod12(pc);
	return preferFlats ? FLAT_NAMES[p] : SHARP_NAMES[p];
}

/** "Db"/"C#"/"C" → pitch class. Accepts multiple accidentals (Cbb, F##). */
export function nameToPc(name: string): number {
	const m = /^([A-Ga-g])([#b♯♭x]*)$/.exec(name.trim());
	if (!m) throw new Error(`nameToPc: invalid note name "${name}"`);
	let pc = LETTER_PC[m[1].toUpperCase()];
	for (const ch of m[2]) {
		if (ch === "#" || ch === "♯") pc += 1;
		else if (ch === "b" || ch === "♭") pc -= 1;
		else if (ch === "x") pc += 2; // double sharp
	}
	return mod12(pc);
}

/** Pitch class + octave → MIDI note. C4 = 60. */
export function toMidi(pc: PitchClass, octave: number): number {
	return mod12(pc) + (octave + 1) * 12;
}

/** MIDI note → { pc, octave }. Inverse of toMidi. */
export function fromMidi(midi: number): { pc: PitchClass; octave: number } {
	return { pc: mod12(midi), octave: Math.floor(midi / 12) - 1 };
}
