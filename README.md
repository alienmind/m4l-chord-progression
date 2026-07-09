# Chord Progression - Max for Live MIDI device

A MIDI-generator device that turns roman-numeral chord
progressions into MIDI clips on the active track. React UI inside `jweb`, music
theory in pure TypeScript, LiveAPI clip-writing in a `[js]` object.

## What it does

- Follows Ableton **Live 12**'s global key/scale (`live_set root_note` /
 `scale_name`), or use manual Key + Mode dropdowns.
- Type a progression in roman-numeral notation (`I - V - vi - IV`,
 `ii7 - V7 - Imaj7`, `i - VII - VI - V`, slash chords `I/V`, extensions `add9`,
 qualities `sus4`/`ø7`/`°`/`+`). Numerals are **mode-relative** (in a minor
 scale `VII` is already the natural-minor 7th; `bVII` would flatten it further).
- Two-way translation between roman-numeral and absolute-chord notation
 (`romanToAbsolute` / `absoluteToRoman` in `src/lib/theory/roman.ts`).
- Preset progressions with "feeling" labels (major + minor lists).
- **Generate** button = weighted randomizer; the Conventional↔Adventurous slider
 raises the probability of sevenths, extensions, borrowed chords and secondary
 dominants.
- Count / Octave / Bars steppers; **Block vs Arp** toggle.
- **Write Clip** creates a MIDI clip in the highlighted slot (or the first empty
 slot on the selected track).

## Project layout

```
wrapper.js # Max-side [js]: UI loader + scale observers + clip writer
src/lib/theory/ # pure, unit-tested theory engine (pitch/scale/chord/roman/…)
src/hooks/ # useScaleFromLive, useProgression
src/components/ # ChordGrid, Stepper
src/App.tsx # mini + expanded layouts
scripts/postbuild.mjs # renames UI html, copies js/amxd, zips
ableton-amxd/ableton-template.amxd # template copied from livecam-m4l/ableton-amxd/
```

## Build & test

```
pnpm install
pnpm test # vitest - theory engine (26 tests)
pnpm build # → dist/m4l-chord-progression/{m4l-chord-progression.amxd, chordprog-ui.html, wrapper.js}
           #   + dist/m4l-chord-progression.zip (release archive of that folder)
pnpm dev # browser dev on 127.0.0.1:5174; use maxSimulate('scale', 0, 'Major')
```

## Installing in Ableton

Copy `dist/m4l-chord-progression.zip` into your Ableton **User Library**, under
`Max4Live Devices` (e.g. `…/User Library/Presets/MIDI Effects/Max MIDI Effect/Max4Live Devices/`),
and **uncompress it there**. This yields a `m4l-chord-progression/` folder with
the `.amxd` and its `chordprog-ui.html` / `wrapper.js` side by side — the device
loads them relative to its own location, so they must stay together. Then drag
`m4l-chord-progression.amxd` onto a MIDI track from Live's browser.

## jweb ⇄ [js] protocol

- `[js]` → `jweb` (outlet 0): `url <file://…>`, then `scale <root 0..11> <name…>`.
- `jweb` → `[js]` (jweb outlet → js inlet):
 `write_clip <lengthBeats> <n> <p1 s1 d1 v1> <p2 …>` (flat numeric list - never
 raw JSON, which Max would tokenize on whitespace/commas).

## Creating `ableton-amxd/ableton-template.amxd` (do this once, in Max)

1. In Ableton: drag a **Max MIDI Effect** onto a MIDI track → click **Edit** to
 open the Max editor.
2. Keep the default `midiin → midiout` wired (the device stays MIDI-transparent;
 generated notes go to a clip, not through the MIDI stream).
3. Add three objects: `live.thisdevice`, `js wrapper.js`,
 `jweb @enablejavascript 1`.
4. Wire them:
 - `live.thisdevice` outlet 0 → `js` inlet 0
 - `js` outlet 0 → `jweb` inlet 0
 - **`jweb` outlet 0 → `js` inlet 0** (the return path for `write_clip`)
5. Select the `jweb` object → Inspector: set **Initial URL** to `about:blank`.
6. Add `jweb` to the Presentation view, size it ~320×180, and enable
 "Open in Presentation" for the device.
7. **Save** the device as `ableton-amxd/ableton-template.amxd` (or copy the pre-built `ableton-template.amxd` from `livecam-m4l/ableton-amxd/`).
8. Distribute the `dist/m4l-chord-progression/` folder as-is: it contains
 `m4l-chord-progression.amxd` (a renamed copy of the template) with
 `chordprog-ui.html` and `wrapper.js` next to it (the postbuild zip bundles
 the same folder).

Check the Max Console for `wrapper.js loaded`, `chordprog: sent url …`, and
`chordprog: scale observers ready`. **Never Freeze** the device - distribute it
as the folder so the `file://` UI resolves.
