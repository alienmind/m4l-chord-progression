/**
 * roman.ts - roman-numeral progression parser / renderer, and the two-way
 * translation between roman-numeral and absolute-chord notations.
 *
 * Grammar (per chord token):
 * CHORD := ACC? NUMERAL QUALITY? EXTS* SLASH?
 * ACC := "b" | "#"
 * NUMERAL:= I|II|III|IV|V|VI|VII (uppercase = major base, lowercase = minor)
 * QUALITY:= maj7|Δ7|Δ|m7|7|dim7|°7|°|dim|ø7|ø|m7b5|aug|+|sus2|sus4|6
 * EXTS := add9|add11|add13|9|11|13|b5|#5|b9|#9|#11|b13
 * SLASH := "/" (ACC? NUMERAL | NOTE_NAME)
 *
 * Tokens are separated by whitespace, "-" or ",".
 */

import type { ChordSpec, Quality } from "./chord";
import { absoluteName, specFromAbsolute } from "./chord";
import type { KeyContext } from "./scale";
import { nameToPc } from "./pitch";

export interface ParseError {
	index: number; // token position in the progression
	token: string;
	msg: string;
}

export interface ParseResult {
	chords: ChordSpec[];
	errors: ParseError[];
}

const NUMERAL_VALUE: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
};

// Try longer numerals first so "III" isn't read as "II" + "I".
const NUMERALS = ["VII", "III", "VI", "IV", "II", "V", "I"];

interface QualityToken {
	re: RegExp;
	quality: Quality;
}

// Ordered longest-match-first. Case-sensitive matters are handled separately.
const QUALITY_TOKENS: QualityToken[] = [
	{ re: /^(maj7|Δ7|Δ)/, quality: "maj7" },
	{ re: /^(m7b5|ø7|ø)/, quality: "halfdim7" },
	{ re: /^(dim7|°7|o7)/, quality: "dim7" },
	{ re: /^(dim|°|o)/, quality: "dim" },
	{ re: /^(m7)/, quality: "min7" },
	{ re: /^(sus2)/, quality: "sus2" },
	{ re: /^(sus4|sus)/, quality: "sus4" },
	{ re: /^(aug|\+)/, quality: "aug" },
	{ re: /^(m6)/, quality: "min6" },
	{ re: /^(6)/, quality: "maj6" },
	{ re: /^(7)/, quality: "dom7" },
	{ re: /^(m)/, quality: "min" },
];

function splitTokens(text: string): string[] {
	return text
		.trim()
		.split(/[\s,\-]+/)
		.filter((t) => t.length > 0);
}

/** Parse one chord token into a ChordSpec, or throw with a message. */
export function parseChordToken(token: string): ChordSpec {
	let s = token;

	// Leading accidental on the numeral
	let accidental = 0;
	while (s[0] === "b" || s[0] === "#") {
		// Ambiguity: a leading 'b' could be a bVII accidental. Only treat as an
		// accidental if a numeral follows.
		const rest = s.slice(1);
		if (s[0] === "b" && /^[IiVv]/.test(rest)) {
			accidental -= 1;
			s = rest;
		} else if (s[0] === "#") {
			accidental += 1;
			s = rest;
		} else break;
	}

	// Numeral (case sets the default quality)
	let numeral = "";
	for (const n of NUMERALS) {
		if (s.toUpperCase().startsWith(n)) {
			numeral = s.slice(0, n.length);
			s = s.slice(n.length);
			break;
		}
	}
	if (!numeral) throw new Error(`no roman numeral in "${token}"`);

	const degree = NUMERAL_VALUE[numeral.toUpperCase()];
	const isLower = numeral === numeral.toLowerCase();
	let quality: Quality = isLower ? "min" : "maj";

	// Slash bass - split off before quality/extension scanning
	let slashDegree: ChordSpec["slashDegree"];
	let slashPc: number | undefined;
	const slashIdx = s.indexOf("/");
	if (slashIdx >= 0) {
		const bass = s.slice(slashIdx + 1);
		s = s.slice(0, slashIdx);
		const parsedBass = parseSlashBass(bass);
		if ("pc" in parsedBass) slashPc = parsedBass.pc;
		else slashDegree = parsedBass;
	}

	// Explicit quality overrides the case default
	for (const qt of QUALITY_TOKENS) {
		const m = qt.re.exec(s);
		if (m) {
			quality = qt.quality;
			s = s.slice(m[0].length);
			break;
		}
	}

	// Extensions & alterations (order-independent, consume the rest)
	const extensions: number[] = [];
	const alterations: string[] = [];
	const tokenRe = /add9|add11|add13|b5|#5|b9|#9|#11|b13|9|11|13/g;
	let m: RegExpExecArray | null;
	let consumed = "";
	while ((m = tokenRe.exec(s))) {
		consumed += m[0];
		switch (m[0]) {
			case "add9":
			case "9":
				extensions.push(14);
				if (m[0] === "9" && !isSeventh(quality)) quality = upgradeToSeventh(quality);
				break;
			case "add11":
			case "11":
				extensions.push(17);
				break;
			case "add13":
			case "13":
				extensions.push(21);
				break;
			default:
				alterations.push(m[0]);
		}
	}

	return { degree, accidental, quality, extensions, alterations, slashDegree, slashPc };
}

function isSeventh(q: Quality): boolean {
	return ["dom7", "maj7", "min7", "halfdim7", "dim7", "minmaj7"].includes(q);
}

function upgradeToSeventh(q: Quality): Quality {
	if (q === "maj") return "dom7";
	if (q === "min") return "min7";
	return q;
}

function parseSlashBass(
	bass: string,
): { degree: number; accidental: number } | { pc: number } {
	// Absolute note name?
	if (/^[A-G][#b]*$/.test(bass)) {
		try {
			return { pc: nameToPc(bass) };
		} catch {
			/* fall through */
		}
	}
	let accidental = 0;
	let s = bass;
	while (s[0] === "b" || s[0] === "#") {
		accidental += s[0] === "b" ? -1 : 1;
		s = s.slice(1);
	}
	for (const n of NUMERALS) {
		if (s.toUpperCase().startsWith(n)) {
			return { degree: NUMERAL_VALUE[n], accidental };
		}
	}
	return { degree: 1, accidental: 0 };
}

/**
 * Parse a whole progression string into ChordSpecs, collecting errors.
 * Tokens are tried as roman numerals first; when a `key` is given, tokens
 * that aren't numerals fall back to absolute chord names ("Dm7", "Bb"), so
 * both notations - and the output of the randomizer - are accepted.
 */
export function parseProgression(text: string, key?: KeyContext): ParseResult {
	const tokens = splitTokens(text);
	const chords: ChordSpec[] = [];
	const errors: ParseError[] = [];
	tokens.forEach((tok, index) => {
		try {
			chords.push(parseChordToken(tok));
		} catch (e) {
			const abs = key ? specFromAbsolute(tok, key) : null;
			if (abs) {
				chords.push(abs);
				return;
			}
			errors.push({
				index,
				token: tok,
				msg: e instanceof Error ? e.message : String(e),
			});
		}
	});
	return { chords, errors };
}

const NUMERAL_UPPER = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

/** Render a ChordSpec back to roman-numeral text. */
export function renderRoman(spec: ChordSpec): string {
	const idx = ((spec.degree - 1) % 7) + 1;
	const minorBase =
		spec.quality === "min" ||
		spec.quality === "min7" ||
		spec.quality === "min6" ||
		spec.quality === "minmaj7" ||
		spec.quality === "dim" ||
		spec.quality === "dim7" ||
		spec.quality === "halfdim7";
	let num = NUMERAL_UPPER[idx];
	if (minorBase) num = num.toLowerCase();

	const acc = spec.accidental < 0 ? "b" : spec.accidental > 0 ? "#" : "";

	let suffix = "";
	switch (spec.quality) {
		case "maj":
		case "min":
			break;
		case "dom7":
			suffix = "7";
			break;
		case "maj7":
			suffix = "maj7";
			break;
		case "min7":
			suffix = "7";
			break; // lowercase numeral already implies minor
		case "halfdim7":
			suffix = "ø7";
			break;
		case "dim7":
			suffix = "°7";
			break;
		case "dim":
			suffix = "°";
			break;
		case "aug":
			suffix = "+";
			break;
		case "minmaj7":
			suffix = "(maj7)";
			break;
		case "sus2":
			suffix = "sus2";
			break;
		case "sus4":
			suffix = "sus4";
			break;
		case "maj6":
			suffix = "6";
			break;
		case "min6":
			suffix = "6";
			break;
	}

	const extMap: Record<number, string> = { 14: "add9", 17: "add11", 21: "add13" };
	for (const ext of spec.extensions) suffix += extMap[ext] ?? "";
	for (const alt of spec.alterations) suffix += alt;

	let slash = "";
	if (spec.slashDegree) {
		const sAcc =
			spec.slashDegree.accidental < 0
				? "b"
				: spec.slashDegree.accidental > 0
					? "#"
					: "";
		slash = "/" + sAcc + NUMERAL_UPPER[((spec.slashDegree.degree - 1) % 7) + 1];
	}

	return acc + num + suffix + slash;
}

/** "I-V-vi-IV" in C major → "C - G - Am - F". */
export function romanToAbsolute(
	text: string,
	key: KeyContext,
	preferFlats = true,
): string {
	const { chords } = parseProgression(text, key);
	return chords.map((c) => absoluteName(c, key, preferFlats)).join(" - ");
}

/** "C G Am F" in C major → "I - V - vi - IV". */
export function absoluteToRoman(text: string, key: KeyContext): string {
	const tokens = splitTokens(text);
	return tokens
		.map((t) => {
			const spec = specFromAbsolute(t, key);
			return spec ? renderRoman(spec) : "?";
		})
		.join(" - ");
}
