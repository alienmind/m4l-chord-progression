/**
 * maxBridge - thin wrapper over jweb's `window.max` bridge.
 *
 * Inside Max, jweb injects a global `max` object:
 * - max.bindInlet(name, fn) - fn runs when the patch sends `name ...args`
 * into the jweb object's inlet.
 * - max.outlet(...args) - sends a message out the jweb object's outlet.
 *
 * Outside Max (plain browser dev), `window.max` is undefined. We fall back to
 * no-ops + console logging and expose `maxSimulate()` so the UI is fully
 * testable in a normal browser tab without Ableton running.
 */

type InletHandler = (...args: unknown[]) => void;

interface MaxGlobal {
	bindInlet: (name: string, fn: InletHandler) => void;
	outlet: (...args: unknown[]) => void;
}

declare global {
	interface Window {
		max?: MaxGlobal;
		// Dev escape hatch - call from the browser console to fake patch input.
		maxSimulate?: (name: string, ...args: unknown[]) => void;
	}
}

const handlers = new Map<string, InletHandler>();

export const inJweb = typeof window !== "undefined" && !!window.max;

export function bindInlet(name: string, fn: InletHandler): void {
	handlers.set(name, fn);
	if (typeof window !== "undefined" && window.max) {
		window.max.bindInlet(name, fn);
	}
}

export function outlet(...args: unknown[]): void {
	if (typeof window !== "undefined" && window.max) {
		window.max.outlet(...args);
	} else {
		console.debug("[maxBridge:outlet]", ...args);
	}
}

// Wire up the console simulator once, for browser-only development.
if (typeof window !== "undefined" && !window.max) {
	window.maxSimulate = (name, ...args) => {
		const fn = handlers.get(name);
		if (fn) fn(...args);
		else console.warn(`[maxBridge] no handler bound for "${name}"`);
	};
	console.info(
		"[maxBridge] running outside Max. Try: maxSimulate('scale', 0, 'Major')",
	);
}
