import { cn } from "@/lib/utils";
import type { RenderedChord } from "@/hooks/useProgression";

interface ChordGridProps {
	chords: RenderedChord[];
	compact?: boolean;
}

/**
 * The middle section: one card per chord, roman numeral on top and the resolved
 * absolute chord name large in the middle (mirrors the FL Studio layout).
 */
export function ChordGrid({ chords, compact }: ChordGridProps) {
	if (chords.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
				Type a progression below
			</div>
		);
	}
	return (
		<div
			className={cn(
				"grid flex-1 gap-1.5",
				compact ? "grid-flow-col auto-cols-fr" : "grid-flow-col auto-cols-fr",
			)}
		>
			{chords.map((c, i) => (
				<div
					key={i}
					className={cn(
						"flex flex-col items-center justify-between rounded-md border bg-card p-2",
						compact && "p-1",
					)}
				>
					<span className="text-[10px] font-medium text-muted-foreground">
						{c.roman}
					</span>
					<span
						className={cn(
							"font-semibold leading-none",
							compact ? "text-sm" : "text-lg",
						)}
					>
						{c.name}
					</span>
					<span className="text-[9px] tabular-nums text-muted-foreground/70">
						{c.notes.length} notes
					</span>
				</div>
			))}
		</div>
	);
}
