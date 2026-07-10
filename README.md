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
scripts/postbuild.mjs # renames UI html, generates the amxd, zips
scripts/build-amxd.mjs # wraps ableton-amxd/patcher.json in the amxd container
ableton-amxd/patcher.json # the device patcher (source of truth, plain JSON)
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

```
scripts\install-windows.ps1   # Windows
scripts/install-mac.sh        # macOS
scripts/install-linux.sh      # Linux (Live under Wine)
```

Each script reads the User Library location from Live's `Library.cfg`
(`%APPDATA%\Ableton\Live <ver>\Preferences` on Windows,
`~/Library/Preferences/Ableton/Live <ver>` on macOS - no registry or env vars),
falls back to Live's default location, and replaces
`User Library/Max For Live/m4l-chord-progression/` with the built folder. The
`.amxd`, `chordprog-ui.html` and `wrapper.js` must stay side by side - the
device loads them relative to its own location. Then drag
`m4l-chord-progression.amxd` onto a MIDI track from Live's browser.

## jweb ⇄ [js] protocol

- `[js]` → `jweb` (outlet 0): `url <file://…>`, then `scale <root 0..11> <name…>`.
- `jweb` → `[js]` (jweb outlet → js inlet):
 `write_clip <lengthBeats> <n> <p1 s1 d1 v1> <p2 …>` (flat numeric list - never
 raw JSON, which Max would tokenize on whitespace/commas).

## How the `.amxd` is built (no manual Max step)

`scripts/build-amxd.mjs` wraps `ableton-amxd/patcher.json` (plus an embedded
copy of `wrapper.js`) in the amxd binary container at build time, so the device
patcher is versioned as plain JSON and the build is fully automated. The
patcher is a **Max MIDI Effect** wired as: `midiin → midiout` (MIDI-transparent;
notes go to clips via LiveAPI), `live.thisdevice → js wrapper.js → jweb`, and
`jweb → js` (the return path for `write_clip`), opening in Presentation with
the jweb filling the device view.

> **History / warning:** earlier revisions shipped
> `ableton-amxd/ableton-template.amxd`, a byte-patched copy of the LiveCam
> device (string-replacing `livecam.js` → `wrapper.js` in the binary). That is
> not a valid approach: the file was a *frozen* device still embedding
> LiveCam's old glue script and patcher, so Live showed "Your file couldn't be
> accessed" / ran the wrong code. Never binary-patch an .amxd; regenerate it
> from `patcher.json` instead. To tweak the patch interactively, open the
> built device in Live's Max editor, edit, and port the changes back into
> `patcher.json`.

Check the Max Console for `wrapper.js loaded`, `chordprog: sent url …`, and
`chordprog: scale observers ready`. **Never Freeze** the device - distribute it
as the folder so the `file://` UI resolves.
