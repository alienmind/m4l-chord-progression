/**
 * midi.ts - turn realized chords (arrays of MIDI note numbers) into timed note
 * events spanning a number of bars, as block chords or a rising arpeggio.
 */

export interface NoteEvent {
	pitch: number;
	start: number; // beats from clip start
	duration: number; // beats
	velocity: number;
}

export interface ToNoteOptions {
	lengthBars: number;
	beatsPerBar?: number; // default 4
	arp: boolean;
	velocity?: number; // default 100
	gate?: number; // fraction of the slot the note sounds, default 0.98
	arpStep?: number; // beats per arp note, default 0.25 (1/16)
}

export function toNoteEvents(
	chords: number[][],
	opts: ToNoteOptions,
): NoteEvent[] {
	const beatsPerBar = opts.beatsPerBar ?? 4;
	const velocity = opts.velocity ?? 100;
	const gate = opts.gate ?? 0.98;
	const arpStep = opts.arpStep ?? 0.25;
	const totalBeats = opts.lengthBars * beatsPerBar;
	const n = chords.length;
	if (n === 0) return [];

	const span = totalBeats / n; // beats per chord slot
	const events: NoteEvent[] = [];

	chords.forEach((notes, k) => {
		const slotStart = k * span;
		if (!opts.arp) {
			const dur = span * gate;
			for (const pitch of notes) {
				events.push({ pitch, start: slotStart, duration: dur, velocity });
			}
			return;
		}
		// Arpeggio: cycle upward through the chord tones plus their octave above
		// (a two-octave pool), one note per arpStep, filling the slot.
		const pool = [...notes, ...notes.map((p) => p + 12)];
		const steps = Math.max(1, Math.round(span / arpStep));
		for (let s = 0; s < steps; s++) {
			events.push({
				pitch: pool[s % pool.length],
				start: slotStart + s * arpStep,
				duration: arpStep * gate,
				velocity,
			});
		}
	});

	return events;
}

/**
 * Flatten note events into the numeric list the Max [js] side expects:
 * [lengthBeats, noteCount, p1,s1,d1,v1, p2,s2,d2,v2, ...]
 */
export function toFlatList(
	events: NoteEvent[],
	lengthBeats: number,
): number[] {
	const out: number[] = [lengthBeats, events.length];
	for (const e of events) {
		out.push(e.pitch, round(e.start), round(e.duration), e.velocity);
	}
	return out;
}

function round(n: number): number {
	return Math.round(n * 1000) / 1000;
}
