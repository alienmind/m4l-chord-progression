import { useEffect, useMemo, useState } from "react";
import { bindInlet, outlet } from "@/lib/maxBridge";
import type { KeyContext } from "@/lib/theory/scale";
import { parseProgression, renderRoman, type ParseError } from "@/lib/theory/roman";
import { absoluteName, realize, type ChordSpec } from "@/lib/theory/chord";
import { toNoteEvents, toFlatList } from "@/lib/theory/midi";
import { randomProgression } from "@/lib/theory/randomize";

export interface RenderedChord {
	spec: ChordSpec;
	roman: string;
	name: string; // absolute chord name
	notes: number[]; // MIDI notes
}

export interface ProgressionState {
	text: string;
	setText: (t: string) => void;
	octave: number;
	setOctave: (n: number) => void;
	lengthBars: number;
	setLengthBars: (n: number) => void;
	count: number;
	setCount: (n: number) => void;
	adventurousness: number;
	setAdventurousness: (n: number) => void;
	arp: boolean;
	setArp: (v: boolean) => void;
	chords: RenderedChord[];
	errors: ParseError[];
	randomize: () => void;
	writeClip: () => void;
	/** True for a moment after Max confirms the clip was created. */
	written: boolean;
}

export function useProgression(key: KeyContext): ProgressionState {
	const [text, setText] = useState("I - V - vi - IV");
	const [octave, setOctave] = useState(4);
	const [lengthBars, setLengthBars] = useState(1);
	const [count, setCount] = useState(4);
	const [adventurousness, setAdventurousness] = useState(0.3);
	const [arp, setArp] = useState(false);
	const [written, setWritten] = useState(false);

	useEffect(() => {
		// The [js] side confirms clip creation with `clip_written 1`.
		bindInlet("clip_written", () => {
			setWritten(true);
			window.setTimeout(() => setWritten(false), 2000);
		});
	}, []);

	const { chords, errors } = useMemo(() => {
		const parsed = parseProgression(text, key);
		const rendered: RenderedChord[] = parsed.chords.map((spec) => ({
			spec,
			roman: renderRoman(spec),
			name: absoluteName(spec, key),
			notes: realize(spec, key, octave),
		}));
		return { chords: rendered, errors: parsed.errors };
	}, [text, key, octave]);

	function randomize() {
		const specs = randomProgression({ key, count, adventurousness });
		// Reflect back into the text box using absolute names so the user sees a
		// concrete, editable result (roman rendering is also available).
		setText(specs.map((s) => absoluteName(s, key)).join(" - "));
	}

	function writeClip() {
		const beatsPerBar = 4;
		const lengthBeats = lengthBars * beatsPerBar;
		const events = toNoteEvents(
			chords.map((c) => c.notes),
			{ lengthBars, arp },
		);
		const flat = toFlatList(events, lengthBeats);
		outlet("write_clip", ...flat);
	}

	return {
		text,
		setText,
		octave,
		setOctave,
		lengthBars,
		setLengthBars,
		count,
		setCount,
		adventurousness,
		setAdventurousness,
		arp,
		setArp,
		chords,
		errors,
		randomize,
		writeClip,
		written,
	};
}
