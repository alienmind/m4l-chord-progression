import { describe, it, expect } from "vitest";
import {
	parseProgression,
	parseChordToken,
	renderRoman,
	romanToAbsolute,
	absoluteToRoman,
} from "../roman";
import type { KeyContext } from "../scale";

const C_MAJOR: KeyContext = { root: 0, mode: "ionian" };
const A_MINOR: KeyContext = { root: 9, mode: "aeolian" };

describe("parseChordToken", () => {
	it("reads case as major/minor base", () => {
		expect(parseChordToken("I").quality).toBe("maj");
		expect(parseChordToken("vi").quality).toBe("min");
	});

	it("reads accidentals on the numeral", () => {
		const c = parseChordToken("bVII");
		expect(c.degree).toBe(7);
		expect(c.accidental).toBe(-1);
	});

	it("reads explicit qualities and extensions", () => {
		expect(parseChordToken("V7").quality).toBe("dom7");
		expect(parseChordToken("iø7").quality).toBe("halfdim7");
		expect(parseChordToken("IVsus4").quality).toBe("sus4");
		expect(parseChordToken("Iadd9").extensions).toContain(14);
	});

	it("reads slash inversions", () => {
		const c = parseChordToken("I/V");
		expect(c.slashDegree).toEqual({ degree: 5, accidental: 0 });
	});
});

describe("parseProgression", () => {
	it("splits on spaces, dashes and commas", () => {
		expect(parseProgression("I-V-vi-IV").chords).toHaveLength(4);
		expect(parseProgression("I V vi IV").chords).toHaveLength(4);
		expect(parseProgression("ii7, V7, Imaj7").chords).toHaveLength(3);
	});

	it("collects errors for garbage tokens", () => {
		const r = parseProgression("I Q V");
		expect(r.errors).toHaveLength(1);
		expect(r.errors[0].token).toBe("Q");
	});
});

describe("two-way translation", () => {
	it("roman → absolute in C major", () => {
		expect(romanToAbsolute("I-V-vi-IV", C_MAJOR)).toBe("C - G - Am - F");
	});

	it("roman → absolute in A minor (mode-relative degrees)", () => {
		expect(romanToAbsolute("i-VII-VI-V", A_MINOR)).toBe("Am - G - F - E");
	});

	it("absolute → roman in C major", () => {
		expect(absoluteToRoman("C G Am F", C_MAJOR)).toBe("I - V - vi - IV");
	});

	it("renderRoman round-trips a parsed token", () => {
		expect(renderRoman(parseChordToken("bVII"))).toBe("bVII");
		expect(renderRoman(parseChordToken("V7"))).toBe("V7");
	});
});
