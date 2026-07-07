/**
 * presets.ts - curated progressions with "feeling" labels, split into major-key
 * and minor-key lists (mirroring the FL Studio reference UI). Selecting a preset
 * fills the progression text box with its roman-numeral notation.
 */

export interface Preset {
	label: string;
	feeling: string;
	roman: string;
}

export const MAJOR_PRESETS: Preset[] = [
	{ label: "Pop Axis", feeling: "Hopeful", roman: "I - V - vi - IV" },
	{ label: "Optimistic", feeling: "Uplifting", roman: "I - IV - V - IV" },
	{ label: "50s Doo-Wop", feeling: "Nostalgic", roman: "I - vi - IV - V" },
	{ label: "Sensitive", feeling: "Reflective", roman: "vi - IV - I - V" },
	{ label: "Jazz ii-V-I", feeling: "Smooth", roman: "ii7 - V7 - Imaj7" },
	{ label: "Canon", feeling: "Triumphant", roman: "I - V - vi - iii - IV - I - IV - V" },
	{ label: "Cheerful", feeling: "Bright", roman: "I - IV - vi - V" },
	{ label: "Bittersweet", feeling: "Wistful", roman: "IV - V - iii - vi" },
	{ label: "Gentle Rise", feeling: "Warm", roman: "I - iii - IV - V" },
	{ label: "Dreamy", feeling: "Floating", roman: "Imaj7 - IVmaj7 - iii7 - vi7" },
	{ label: "Andalusian Bright", feeling: "Dramatic", roman: "I - bVII - IV - I" },
	{ label: "Soulful", feeling: "Rich", roman: "Imaj7 - vi7 - ii7 - V7" },
];

// Minor-key numerals are mode-relative: in the natural-minor (aeolian) scale
// the III / VI / VII degrees are already the "flat" degrees, so they are written
// without a flat prefix (matching the FL Studio reference lists). A leading "b"
// here would mean a further chromatic flattening.
export const MINOR_PRESETS: Preset[] = [
	{ label: "Melancholic", feeling: "Sad", roman: "i - VI - III - VII" },
	{ label: "Tense", feeling: "Dark", roman: "i - iv - v - i" },
	{ label: "Andalusian", feeling: "Dramatic", roman: "i - VII - VI - V" },
	{ label: "Epic", feeling: "Grand", roman: "i - VI - III - VII" },
	{ label: "Emotional", feeling: "Longing", roman: "i - III - VII - iv" },
	{ label: "Somber", feeling: "Heavy", roman: "iv - i - v - i" },
	{ label: "Atmospheric", feeling: "Mysterious", roman: "i - III - iv - v" },
	{ label: "Brooding", feeling: "Ominous", roman: "i - iv - VII - III" },
	{ label: "Poignant", feeling: "Introspective", roman: "i7 - iv7 - VIImaj7 - IIImaj7" },
	{ label: "Seductive", feeling: "Sultry", roman: "i - VI - iv - V7" },
	{ label: "Anxious", feeling: "Restless", roman: "i - v - VI - iv" },
	{ label: "Hypnotic", feeling: "Trance", roman: "i - VII - i - VI" },
];
