/**
 * randomize.ts - generate a progression whose harmonic adventurousness is
 * controlled by a 0..1 slider. Low = diatonic triads with cadential shape;
 * high = sevenths, extensions, borrowed chords and secondary dominants.
 */

import type { ChordSpec, Quality } from "./chord";
import type { KeyContext, Mode } from "./scale";

export interface RandomOptions {
	key: KeyContext;
	count: number;
	adventurousness: number; // 0..1
	rng?: () => number; // injectable for deterministic tests
}

interface Candidate {
	spec: ChordSpec;
	weight: number;
}

/** Diatonic triad quality per degree, for the major (ionian) system. */
const MAJOR_TRIAD_QUALITY: Quality[] = [
	"maj", // I
	"min", // ii
	"min", // iii
	"maj", // IV
	"maj", // V
	"min", // vi
	"dim", // vii°
];

/** Diatonic triad quality per degree for the natural-minor (aeolian) system. */
const MINOR_TRIAD_QUALITY: Quality[] = [
	"min", // i
	"dim", // ii°
	"maj", // bIII
	"min", // iv
	"min", // v
	"maj", // bVI
	"maj", // bVII
];

function isMinorMode(mode: Mode): boolean {
	return mode === "aeolian" || mode === "dorian" || mode === "phrygian" || mode === "locrian";
}

function baseTriad(degree: number, mode: Mode): Quality {
	const table = isMinorMode(mode) ? MINOR_TRIAD_QUALITY : MAJOR_TRIAD_QUALITY;
	return table[(degree - 1) % 7];
}

function spec(
	degree: number,
	accidental: number,
	quality: Quality,
	extensions: number[] = [],
): ChordSpec {
	return { degree, accidental, quality, extensions, alterations: [] };
}

function seventhOf(q: Quality): Quality {
	switch (q) {
		case "maj":
			return "maj7";
		case "min":
			return "min7";
		case "dim":
			return "halfdim7";
		default:
			return q;
	}
}

/** Build the weighted candidate pool for one slot. */
function candidatePool(key: KeyContext, adv: number): Candidate[] {
	const pool: Candidate[] = [];
	const adv2 = adv * adv;

	for (let d = 1; d <= 7; d++) {
		const q = baseTriad(d, key.mode);
		pool.push({ spec: spec(d, 0, q), weight: 1 });
		// sevenths / add9 grow with adventurousness
		pool.push({ spec: spec(d, 0, seventhOf(q)), weight: adv });
		pool.push({ spec: spec(d, 0, q, [14]), weight: adv * 0.6 });
	}

	// Borrowed / chromatic colour (weighted by adv²)
	const isMinor = isMinorMode(key.mode);
	if (isMinor) {
		pool.push({ spec: spec(5, 0, "dom7"), weight: adv2 }); // V7 (harmonic minor)
		pool.push({ spec: spec(2, -1, "maj"), weight: adv2 * 0.6 }); // bII (Neapolitan)
	} else {
		pool.push({ spec: spec(7, -1, "maj"), weight: adv2 }); // bVII
		pool.push({ spec: spec(6, -1, "maj"), weight: adv2 }); // bVI
		pool.push({ spec: spec(3, -1, "maj"), weight: adv2 * 0.6 }); // bIII
		pool.push({ spec: spec(4, 0, "min"), weight: adv2 * 0.6 }); // iv (borrowed)
	}

	return pool;
}

function weightedPick(pool: Candidate[], rng: () => number): ChordSpec {
	const total = pool.reduce((s, c) => s + c.weight, 0);
	let r = rng() * total;
	for (const c of pool) {
		r -= c.weight;
		if (r <= 0) return c.spec;
	}
	return pool[pool.length - 1].spec;
}

function sameChord(a: ChordSpec, b: ChordSpec): boolean {
	return a.degree === b.degree && a.accidental === b.accidental;
}

export function randomProgression(opts: RandomOptions): ChordSpec[] {
	const { key, count } = opts;
	const adv = Math.max(0, Math.min(1, opts.adventurousness));
	const rng = opts.rng ?? Math.random;
	const pool = candidatePool(key, adv);
	const result: ChordSpec[] = [];

	for (let i = 0; i < count; i++) {
		const prev = i > 0 ? result[i - 1] : undefined;
		let pick: ChordSpec;

		if (i === 0 && rng() < 1 - 0.6 * adv) {
			// First chord biased strongly toward the tonic at low adventurousness.
			pick = spec(1, 0, baseTriad(1, key.mode));
		} else if (i === count - 1 && rng() < 1 - 0.6 * adv) {
			// Last chord biased toward a cadence (V or IV) at low adventurousness.
			const deg = rng() < 0.7 ? 5 : 4;
			pick = spec(deg, 0, baseTriad(deg, key.mode));
		} else {
			pick = weightedPick(pool, rng);
		}

		// Never allow an immediate repeat, regardless of which branch chose it.
		let guard = 0;
		while (prev && sameChord(pick, prev) && guard++ < 16) {
			pick = weightedPick(pool, rng);
		}
		result.push(pick);
	}
	return result;
}
