import { Minus, Plus } from "lucide-react";

interface StepperProps {
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (n: number) => void;
}

/** Compact labelled +/- number stepper used for Count / Octave / Length. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
	return (
		<div className="flex flex-col items-center gap-0.5">
			<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<div className="flex items-center gap-1 rounded-md bg-input/40 px-1 py-0.5">
				<button
					className="text-muted-foreground hover:text-foreground disabled:opacity-30"
					onClick={() => onChange(Math.max(min, value - 1))}
					disabled={value <= min}
				>
					<Minus className="size-3" />
				</button>
				<span className="w-5 text-center text-sm font-semibold tabular-nums">
					{value}
				</span>
				<button
					className="text-muted-foreground hover:text-foreground disabled:opacity-30"
					onClick={() => onChange(Math.min(max, value + 1))}
					disabled={value >= max}
				>
					<Plus className="size-3" />
				</button>
			</div>
		</div>
	);
}
