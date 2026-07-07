import { useState } from "react";
import { Dice5, Maximize2, Minimize2, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScaleFromLive } from "@/hooks/useScaleFromLive";
import { useProgression } from "@/hooks/useProgression";
import { ChordGrid } from "@/components/ChordGrid";
import { Stepper } from "@/components/Stepper";
import { MODES, MODE_LABELS } from "@/lib/theory/scale";
import { pcToName } from "@/lib/theory/pitch";
import { MAJOR_PRESETS, MINOR_PRESETS } from "@/lib/theory/presets";

const KEY_NAMES = Array.from({ length: 12 }, (_, i) => pcToName(i, false));

export default function App() {
	const scale = useScaleFromLive();
	const prog = useProgression(scale.key);
	const [expanded, setExpanded] = useState(false);

	const keyLabel = `${pcToName(scale.key.root, false)} ${MODE_LABELS[scale.key.mode].split(" ")[0]}`;

	return (
		<div className="flex h-full w-full flex-col gap-1.5 bg-background p-2 text-foreground">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold tracking-tight">
						Chord Progression
					</span>
					<span className="rounded bg-input/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						{keyLabel}
					</span>
				</div>
				<button
					className="text-muted-foreground hover:text-foreground"
					onClick={() => setExpanded((e) => !e)}
					title={expanded ? "Collapse" : "Expand"}
				>
					{expanded ? (
						<Minimize2 className="size-4" />
					) : (
						<Maximize2 className="size-4" />
					)}
				</button>
			</div>

			{expanded ? (
				<ExpandedView scale={scale} prog={prog} />
			) : (
				<MiniView prog={prog} />
			)}
		</div>
	);
}

type ScaleState = ReturnType<typeof useScaleFromLive>;
type ProgState = ReturnType<typeof useProgression>;

function MiniView({ prog }: { prog: ProgState }) {
	return (
		<>
			<ChordGrid chords={prog.chords} compact />
			<div className="flex items-center gap-1.5">
				<GenerateButton prog={prog} />
				<WriteButton prog={prog} />
			</div>
		</>
	);
}

function ExpandedView({ scale, prog }: { scale: ScaleState; prog: ProgState }) {
	return (
		<>
			{/* Top bar: generate + adventurousness + steppers */}
			<div className="flex items-center gap-3 rounded-md bg-card/50 p-2">
				<GenerateButton prog={prog} />
				<div className="flex flex-1 flex-col gap-0.5">
					<div className="flex justify-between text-[10px] text-muted-foreground">
						<span>Conventional</span>
						<span>Adventurous</span>
					</div>
					<input
						type="range"
						min={0}
						max={1}
						step={0.01}
						value={prog.adventurousness}
						onChange={(e) => prog.setAdventurousness(Number(e.target.value))}
						className="accent-accent"
					/>
				</div>
				<Stepper label="Count" value={prog.count} min={1} max={8} onChange={prog.setCount} />
				<Stepper label="Octave" value={prog.octave} min={1} max={7} onChange={prog.setOctave} />
				<Stepper label="Bars" value={prog.lengthBars} min={1} max={8} onChange={prog.setLengthBars} />
			</div>

			{/* Middle: chord cards */}
			<ChordGrid chords={prog.chords} />

			{/* Key / scale controls */}
			<div className="flex items-center gap-2 text-xs">
				<label className="flex items-center gap-1">
					<input
						type="checkbox"
						checked={scale.follow}
						onChange={(e) => scale.setFollow(e.target.checked)}
					/>
					Follow Live
				</label>
				<select
					className="rounded bg-input/50 px-1 py-0.5 disabled:opacity-40"
					value={scale.key.root}
					disabled={scale.follow && scale.liveMode !== null}
					onChange={(e) => scale.setManualRoot(Number(e.target.value))}
				>
					{KEY_NAMES.map((n, i) => (
						<option key={i} value={i}>
							{n}
						</option>
					))}
				</select>
				<select
					className="rounded bg-input/50 px-1 py-0.5 disabled:opacity-40"
					value={scale.key.mode}
					disabled={scale.follow && scale.liveMode !== null}
					onChange={(e) => scale.setManualMode(e.target.value as (typeof MODES)[number])}
				>
					{MODES.map((m) => (
						<option key={m} value={m}>
							{MODE_LABELS[m]}
						</option>
					))}
				</select>
				{scale.follow && scale.liveMode === null && (
					<span className="text-[10px] text-destructive">
						Live scale "{scale.liveScaleName}" unsupported - using manual
					</span>
				)}
			</div>

			{/* Bottom: presets + progression text + arp + write */}
			<div className="flex items-center gap-2">
				<PresetSelect
					label="Major"
					presets={MAJOR_PRESETS}
					onPick={(roman) => prog.setText(roman)}
				/>
				<PresetSelect
					label="Minor"
					presets={MINOR_PRESETS}
					onPick={(roman) => prog.setText(roman)}
				/>
				<label className="flex items-center gap-1 text-xs">
					<input
						type="checkbox"
						checked={prog.arp}
						onChange={(e) => prog.setArp(e.target.checked)}
					/>
					Arp
				</label>
			</div>

			<div className="flex items-center gap-2">
				<input
					value={prog.text}
					onChange={(e) => prog.setText(e.target.value)}
					spellCheck={false}
					className={cn(
						"flex-1 rounded-md bg-input/40 px-2 py-1 font-mono text-sm outline-none",
						prog.errors.length > 0 && "ring-1 ring-destructive",
					)}
					placeholder="I - V - vi - IV"
				/>
				<WriteButton prog={prog} />
			</div>
			{prog.errors.length > 0 && (
				<span className="text-[10px] text-destructive">
					Unparsed: {prog.errors.map((e) => e.token).join(", ")}
				</span>
			)}
		</>
	);
}

function GenerateButton({ prog }: { prog: ProgState }) {
	return (
		<button
			className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-110"
			onClick={prog.randomize}
			title="Generate a random progression"
		>
			<Sparkles className="size-3.5" />
			Generate
			<Dice5 className="size-3.5 opacity-70" />
		</button>
	);
}

function WriteButton({ prog }: { prog: ProgState }) {
	return (
		<button
			className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-40"
			onClick={prog.writeClip}
			disabled={prog.chords.length === 0}
			title="Write a MIDI clip on the active track"
		>
			<Download className="size-3.5" />
			Write Clip
		</button>
	);
}

function PresetSelect({
	label,
	presets,
	onPick,
}: {
	label: string;
	presets: { label: string; feeling: string; roman: string }[];
	onPick: (roman: string) => void;
}) {
	return (
		<select
			className="flex-1 rounded-md bg-input/40 px-1.5 py-1 text-xs"
			value=""
			onChange={(e) => {
				if (e.target.value) onPick(e.target.value);
			}}
		>
			<option value="">{label} presets…</option>
			{presets.map((p) => (
				<option key={p.label} value={p.roman}>
					{p.label} - {p.feeling} ({p.roman})
				</option>
			))}
		</select>
	);
}
