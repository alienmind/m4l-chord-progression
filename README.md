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
falls back to Live's default location, and installs **only
`m4l-chord-progression.amxd`** into
`User Library/Max For Live/m4l-chord-progression/`. The device is fully
self-contained (see *Self-contained .amxd* below) - drag it onto a MIDI track
from Live's browser and it unpacks its own UI.

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

## Self-contained .amxd (single-file distribution)

The `.amxd` is the **only file you need to distribute** - the React UI is
carried inside it and self-extracts on first load. How, and why this shape:

1. `vite-plugin-singlefile` inlines all JS/CSS into one `chordprog-ui.html`.
2. `build-amxd.mjs` appends that file to `wrapper.js` as base64 chunks
   (`UI_PAYLOAD_B64` / `UI_PAYLOAD_BYTES`) before embedding the script in the
   amxd container as a frozen dependency.
3. On device load, `wrapper.js` decodes the payload (Max js has no `atob`,
   so it ships a small ES5 base64 decoder) and writes `chordprog-ui.html`
   next to the `.amxd`, then points `jweb` at that real file via `file://`.
   Extraction is skipped when an identical-size copy already exists, and the
   written size is verified (a mismatch is posted to the Max console).

Two Max quirks force this design - simpler approaches **do not work**:

- **Frozen dependencies are virtual.** Max resolves files embedded in a
  frozen `.amxd` through its own virtual filesystem: `[js] File()` can open
  them, but they never exist as loose files on disk, so handing `jweb`
  (Chromium, which reads the real disk) a `file://` URL to one yields
  `ERR_FILE_NOT_FOUND`. That rules out simply embedding the html as a
  dependency and pointing jweb at it - the running script has to *extract*
  it to disk itself. Embedding the payload in `wrapper.js` (rather than as a
  separate frozen file read via `File()`) keeps the mechanism independent of
  search-path behaviour entirely.
- **`File.writebytes` truncates silently at 16384 bytes per call.** The
  extractor writes in 4096-byte slices; a bigger write produces a corrupt
  file and a gray jweb page with no error anywhere.

> **History / warning:** earlier revisions shipped
> `ableton-amxd/ableton-template.amxd`, a byte-patched copy of the LiveCam
> device (string-replacing `livecam.js` → `wrapper.js` in the binary). That is
> not a valid approach: the file was a *frozen* device still embedding
> LiveCam's old glue script and patcher, so Live showed "Your file couldn't be
> accessed" / ran the wrong code. Never binary-patch an .amxd; regenerate it
> from `patcher.json` instead. To tweak the patch interactively, open the
> built device in Live's Max editor, edit, and port the changes back into
> `patcher.json`.

Check the Max Console for `wrapper.js loaded`,
`chordprog: extracted UI (… bytes) to …` (first load only), and
`chordprog: sent url …` / `chordprog: scale observers ready`.
