import { describe, it, expect } from "vitest";
import { randomProgression } from "../randomize";
import { toNoteEvents, toFlatList } from "../midi";
import { realize } from "../chord";
import type { KeyContext } from "../scale";

const C_MAJOR: KeyContext = { root: 0, mode: "ionian" };

/** Deterministic PRNG (mulberry32) for reproducible tests. */
function seeded(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe("randomProgression", () => {
	it("produces the requested number of chords", () => {
		const p = randomProgression({ key: C_MAJOR, count: 4, adventurousness: 0.5, rng: seeded(1) });
		expect(p).toHaveLength(4);
	});

	it("is deterministic for a fixed seed", () => {
		const a = randomProgression({ key: C_MAJOR, count: 4, adventurousness: 0.5, rng: seeded(42) });
		const b = randomProgression({ key: C_MAJOR, count: 4, adventurousness: 0.5, rng: seeded(42) });
		expect(a).toEqual(b);
	});

	it("stays diatonic at adventurousness 0 (all natural accidentals)", () => {
		const p = randomProgression({ key: C_MAJOR, count: 8, adventurousness: 0, rng: seeded(7) });
		expect(p.every((c) => c.accidental === 0)).toBe(true);
	});

	it("avoids immediate repeats", () => {
		const p = randomProgression({ key: C_MAJOR, count: 8, adventurousness: 0.6, rng: seeded(3) });
		for (let i = 1; i < p.length; i++) {
			expect(p[i].degree === p[i - 1].degree && p[i].accidental === p[i - 1].accidental).toBe(false);
		}
	});
});

describe("midi generation", () => {
	it("block chords span equal slots over the bar", () => {
		const chords = [realize({ degree: 1, accidental: 0, quality: "maj", extensions: [], alterations: [] }, C_MAJOR, 4)];
		const ev = toNoteEvents(chords, { lengthBars: 1, arp: false });
		expect(ev).toHaveLength(3);
		expect(ev[0].start).toBe(0);
		expect(ev[0].duration).toBeCloseTo(4 * 0.98);
	});

	it("arp emits one note per step", () => {
		const chords = [realize({ degree: 1, accidental: 0, quality: "maj", extensions: [], alterations: [] }, C_MAJOR, 4)];
		const ev = toNoteEvents(chords, { lengthBars: 1, arp: true, arpStep: 0.25 });
		expect(ev).toHaveLength(16); // 4 beats / 0.25
	});

	it("flat list has the [len, n, p s d v...] shape", () => {
		const flat = toFlatList([{ pitch: 60, start: 0, duration: 1, velocity: 100 }], 4);
		expect(flat).toEqual([4, 1, 60, 0, 1, 100]);
	});
});
