import { describe, it, expect } from "vitest";
import { realize, absoluteName, specFromAbsolute, type ChordSpec } from "../chord";
import type { KeyContext } from "../scale";

const C_MAJOR: KeyContext = { root: 0, mode: "ionian" };
const A_MINOR: KeyContext = { root: 9, mode: "aeolian" };

function tri(degree: number, accidental = 0, quality: ChordSpec["quality"] = "maj"): ChordSpec {
	return { degree, accidental, quality, extensions: [], alterations: [] };
}

describe("realize", () => {
	it("builds a C major triad at octave 4 (C4=60)", () => {
		expect(realize(tri(1, 0, "maj"), C_MAJOR, 4)).toEqual([60, 64, 67]);
	});

	it("builds a G dominant 7th (V7 in C)", () => {
		expect(realize(tri(5, 0, "dom7"), C_MAJOR, 4)).toEqual([67, 71, 74, 77]);
	});

	it("places slash bass an octave below the root", () => {
		const spec: ChordSpec = { ...tri(1, 0, "maj"), slashDegree: { degree: 5, accidental: 0 } };
		const notes = realize(spec, C_MAJOR, 4);
		expect(notes[0]).toBe(55); // G3 below the C major triad
		expect(notes).toContain(60);
	});
});

describe("absoluteName", () => {
	it("names diatonic triads in C major", () => {
		expect(absoluteName(tri(1, 0, "maj"), C_MAJOR)).toBe("C");
		expect(absoluteName(tri(2, 0, "min"), C_MAJOR)).toBe("Dm");
		expect(absoluteName(tri(5, 0, "dom7"), C_MAJOR)).toBe("G7");
	});

	it("names a half-diminished seventh", () => {
		expect(absoluteName(tri(7, 0, "halfdim7"), C_MAJOR)).toBe("Bm7b5");
	});

	it("names bVII in C major as Bb", () => {
		expect(absoluteName(tri(7, -1, "maj"), C_MAJOR)).toBe("Bb");
	});
});

describe("specFromAbsolute (reverse translation)", () => {
	it("maps Dm7 in C major to ii7", () => {
		const spec = specFromAbsolute("Dm7", C_MAJOR)!;
		expect(spec.degree).toBe(2);
		expect(spec.accidental).toBe(0);
		expect(spec.quality).toBe("min7");
	});

	it("maps Bb in C major to bVII", () => {
		const spec = specFromAbsolute("Bb", C_MAJOR)!;
		expect(spec.degree).toBe(7);
		expect(spec.accidental).toBe(-1);
	});

	it("round-trips diatonic triads in A minor", () => {
		for (const name of ["Am", "C", "Dm", "Em", "F", "G"]) {
			const spec = specFromAbsolute(name, A_MINOR)!;
			expect(absoluteName(spec, A_MINOR)).toBe(name);
		}
	});
});
