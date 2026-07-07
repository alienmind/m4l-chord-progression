import { useEffect, useState } from "react";
import { bindInlet } from "@/lib/maxBridge";
import { liveScaleNameToMode, type KeyContext, type Mode } from "@/lib/theory/scale";

export interface ScaleState {
	/** The key context to use for chord math (Live-driven or manual override). */
	key: KeyContext;
	/** Whether we follow Ableton's global key/scale or use manual dropdowns. */
	follow: boolean;
	liveRoot: number;
	liveMode: Mode | null;
	liveScaleName: string;
	setFollow: (v: boolean) => void;
	setManualRoot: (pc: number) => void;
	setManualMode: (m: Mode) => void;
}

/**
 * Tracks the active key/scale. When `follow` is on and Live 12 reports a
 * supported diatonic scale, the key comes from Ableton; otherwise the user's
 * manual Key + Mode dropdowns drive it.
 */
export function useScaleFromLive(): ScaleState {
	const [follow, setFollow] = useState(true);
	const [liveRoot, setLiveRoot] = useState(0);
	const [liveMode, setLiveMode] = useState<Mode | null>("ionian");
	const [liveScaleName, setLiveScaleName] = useState("Major");
	const [manualRoot, setManualRoot] = useState(0);
	const [manualMode, setManualMode] = useState<Mode>("ionian");

	useEffect(() => {
		// The [js] side sends: `scale <root 0..11> <scaleName...>`
		bindInlet("scale", (...args) => {
			const root = Number(args[0]);
			const name = args.slice(1).join(" ");
			if (!Number.isNaN(root)) setLiveRoot(root);
			setLiveScaleName(name);
			setLiveMode(liveScaleNameToMode(name));
		});
	}, []);

	const followable = follow && liveMode !== null;
	const key: KeyContext = followable
		? { root: liveRoot, mode: liveMode as Mode }
		: { root: manualRoot, mode: manualMode };

	return {
		key,
		follow,
		liveRoot,
		liveMode,
		liveScaleName,
		setFollow,
		setManualRoot,
		setManualMode,
	};
}
