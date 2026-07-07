/**
 * chord.ts - chord qualities, realization to MIDI notes, and naming.
 *
 * A ChordSpec is a scale-relative description: a degree (1..7) + accidental
 * gives the root within the key, a quality gives the base triad/seventh, and
 * extensions/alterations stack colour tones on top. The same spec can be
 * rendered as a roman numeral (see roman.ts) or an absolute chord name.
 */

import { degreePc, type KeyContext } from "./scale";
import { mod12, nameToPc, pcToName, toMidi, type PitchClass } from "./pitch";

export type Quality =
	| "maj"
	| "min"
	| "dim"
	| "aug"
	| "dom7"
	| "maj7"
	| "min7"
	| "halfdim7"
	| "dim7"
	| "minmaj7"
	| "sus2"
	| "sus4"
	| "maj6"
	| "min6";

/** Semitone intervals from the chord root for each quality. */
export const QUALITY_INTERVALS: Record<Quality, number[]> = {
	maj: [0, 4, 7],
	min: [0, 3, 7],
	dim: [0, 3, 6],
	aug: [0, 4, 8],
	dom7: [0, 4, 7, 10],
	maj7: [0, 4, 7, 11],
	min7: [0, 3, 7, 10],
	halfdim7: [0, 3, 6, 10],
	dim7: [0, 3, 6, 9],
	minmaj7: [0, 3, 7, 11],
	sus2: [0, 2, 7],
	sus4: [0, 5, 7],
	maj6: [0, 4, 7, 9],
	min6: [0, 3, 7, 9],
};

export interface ChordSpec {
	degree: number; // 1..7 scale degree
	accidental: number; // -1 flat, 0 natural, +1 sharp (applied to the root)
	quality: Quality;
	extensions: number[]; // added semitone offsets from root, e.g. 14 = add9
	alterations: string[]; // "b5","#5","b9","#9","#11","b13" - colour, kept for naming
	/** Slash bass as a scale degree, or an absolute pitch class. */
	slashDegree?: { degree: number; accidental: number };
	slashPc?: PitchClass;
}

/** Root pitch class of the chord within the key. */
export function rootPc(spec: ChordSpec, key: KeyContext): PitchClass {
	return degreePc(key, spec.degree, spec.accidental);
}

const ALTERATION_SEMITONES: Record<string, number> = {
	b5: 6,
	"#5": 8,
	b9: 13,
	"#9": 15,
	"#11": 18,
	b13: 20,
};

/**
 * Realize a chord to sorted MIDI notes at the given base octave.
 * Slash bass (if any) is placed an octave below the chord root.
 */
export function realize(
	spec: ChordSpec,
	key: KeyContext,
	octave: number,
): number[] {
	const root = rootPc(spec, key);
	const baseMidi = toMidi(root, octave);

	const intervals = [...QUALITY_INTERVALS[spec.quality]];
	for (const ext of spec.extensions) intervals.push(ext);
	for (const alt of spec.alterations) {
		const semi = ALTERATION_SEMITONES[alt];
		if (semi !== undefined) {
			// #5/b5 replace the natural fifth; otherwise stack the tension.
			if (alt === "b5") replaceInterval(intervals, 7, 6);
			else if (alt === "#5") replaceInterval(intervals, 7, 8);
			else intervals.push(semi);
		}
	}

	const notes = new Set<number>();
	for (const iv of intervals) notes.add(baseMidi + iv);

	let midi = Array.from(notes).sort((a, b) => a - b);

	const bassPc = slashBassPc(spec, key);
	if (bassPc !== null) {
		const bass = toMidi(bassPc, octave - 1);
		midi = [bass, ...midi.filter((m) => m !== bass)].sort((a, b) => a - b);
	}
	return midi;
}

function replaceInterval(arr: number[], from: number, to: number): void {
	const i = arr.indexOf(from);
	if (i >= 0) arr[i] = to;
	else arr.push(to);
}

function slashBassPc(spec: ChordSpec, key: KeyContext): PitchClass | null {
	if (spec.slashPc !== undefined) return spec.slashPc;
	if (spec.slashDegree)
		return degreePc(key, spec.slashDegree.degree, spec.slashDegree.accidental);
	return null;
}

const QUALITY_SUFFIX: Record<Quality, string> = {
	maj: "",
	min: "m",
	dim: "dim",
	aug: "aug",
	dom7: "7",
	maj7: "maj7",
	min7: "m7",
	halfdim7: "m7b5",
	dim7: "dim7",
	minmaj7: "m(maj7)",
	sus2: "sus2",
	sus4: "sus4",
	maj6: "6",
	min6: "m6",
};

const EXT_SUFFIX: Record<number, string> = {
	14: "add9",
	17: "add11",
	21: "add13",
};

/** Absolute chord name, e.g. "Cmaj7", "Bbm7b5", "F/A". */
export function absoluteName(
	spec: ChordSpec,
	key: KeyContext,
	preferFlats = true,
): string {
	const root = pcToName(rootPc(spec, key), preferFlats);
	let name = root + QUALITY_SUFFIX[spec.quality];
	for (const ext of spec.extensions) name += EXT_SUFFIX[ext] ?? "";
	for (const alt of spec.alterations) name += alt;
	const bass = slashBassPc(spec, key);
	if (bass !== null) name += "/" + pcToName(bass, preferFlats);
	return name;
}

/**
 * Ordered [regex, quality] table for absolute-name parsing (longest / most
 * specific first). Letter case is significant in chord names ("m" = minor,
 * "M"/"maj" = major), so the lowercase-m patterns are case-sensitive to avoid
 * "m7" being read as the "M7" major-seventh alias.
 */
const QUALITY_PATTERNS: [RegExp, Quality][] = [
	[/^m7b5|^min7b5/, "halfdim7"],
	[/^ø7?/, "halfdim7"],
	[/^dim7|^°7|^o7/i, "dim7"],
	[/^dim|^°|^o(?![a-z])/i, "dim"],
	[/^m\(maj7\)|^minmaj7|^m\+7/, "minmaj7"],
	[/^m7|^min7|^-7/, "min7"],
	[/^maj7|^Δ7?|^M7/, "maj7"],
	[/^m6|^min6/, "min6"],
	[/^6/, "maj6"],
	[/^sus2/i, "sus2"],
	[/^sus4|^sus/i, "sus4"],
	[/^aug|^\+/i, "aug"],
	[/^7/, "dom7"],
	[/^m(?!aj)|^min|^-/, "min"],
];

/**
 * Parse an absolute chord name back into a scale-relative ChordSpec.
 * "Dm7" in C major → { degree:2, accidental:0, quality:"min7", ... }.
 * Returns null if the note name is unparseable.
 */
export function specFromAbsolute(
	name: string,
	key: KeyContext,
): ChordSpec | null {
	const trimmed = name.trim();
	const m = /^([A-Ga-g][#b♯♭]*)(.*)$/.exec(trimmed);
	if (!m) return null;

	let rootName = m[1];
	let rest = m[2];

	// Slash bass
	let slashPc: PitchClass | undefined;
	const slashIdx = rest.indexOf("/");
	if (slashIdx >= 0) {
		const bassName = rest.slice(slashIdx + 1).trim();
		rest = rest.slice(0, slashIdx);
		try {
			slashPc = nameToPc(bassName);
		} catch {
			slashPc = undefined;
		}
	}

	let pc: PitchClass;
	try {
		pc = nameToPc(rootName);
	} catch {
		return null;
	}

	// Detect quality
	let quality: Quality = "maj";
	let after = rest;
	for (const [re, q] of QUALITY_PATTERNS) {
		const qm = re.exec(rest);
		if (qm) {
			quality = q;
			after = rest.slice(qm[0].length);
			break;
		}
	}

	// Extensions / alterations from the remainder
	const extensions: number[] = [];
	const alterations: string[] = [];
	const extRe = /add9|add11|add13/gi;
	let em: RegExpExecArray | null;
	while ((em = extRe.exec(after))) {
		if (/add9/i.test(em[0])) extensions.push(14);
		else if (/add11/i.test(em[0])) extensions.push(17);
		else if (/add13/i.test(em[0])) extensions.push(21);
	}
	const altRe = /b5|#5|b9|#9|#11|b13/gi;
	let am: RegExpExecArray | null;
	while ((am = altRe.exec(after))) alterations.push(am[0].toLowerCase());

	// Resolve pc → nearest scale degree + accidental within the key.
	const { degree, accidental } = pcToDegree(pc, key);

	return { degree, accidental, quality, extensions, alterations, slashPc };
}

/**
 * Find the scale degree (1..7) and accidental (-1/0/+1) that produce pitch
 * class `pc` in the key. Prefers an exact diatonic match (accidental 0).
 */
export function pcToDegree(
	pc: PitchClass,
	key: KeyContext,
): { degree: number; accidental: number } {
	for (let d = 1; d <= 7; d++) {
		if (degreePc(key, d, 0) === pc) return { degree: d, accidental: 0 };
	}
	for (const acc of [-1, 1]) {
		for (let d = 1; d <= 7; d++) {
			if (mod12(degreePc(key, d, 0) + acc) === pc)
				return { degree: d, accidental: acc };
		}
	}
	// Fallback: closest degree below, flatten/sharpen as needed.
	let best = 1;
	let bestDist = 99;
	for (let d = 1; d <= 7; d++) {
		const diff = ((pc - degreePc(key, d, 0) + 12) % 12);
		const dist = Math.min(diff, 12 - diff);
		if (dist < bestDist) {
			bestDist = dist;
			best = d;
		}
	}
	const diff = ((pc - degreePc(key, best, 0) + 12) % 12);
	return { degree: best, accidental: diff <= 6 ? diff : diff - 12 };
}
