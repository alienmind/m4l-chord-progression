---
title: "m4l-chord-progression"
---

# m4l-chord-progression

Advanced chord progression generator and sequencer for Ableton Live.

[Get it on Gumroad](https://alienmindzzz.gumroad.com/l/m4l-chord-progression) | [Download .amxd directly](/m4l-chord-progression/dist/alienmind-chord-progression-m4l.amxd)

---

## Overview

> **Note for Ableton users**: This is a Max for Live **MIDI device**. It acts as a MIDI effect and must be placed on a MIDI track.

![Chord Progression Plugin](/m4l-chord-progression.png)
![Chord Progression Clip](/chordprog-clip.png)

M4L Chord Progression is an advanced generative sequencing tool for Ableton Live. With an intuitive interface, it allows musicians and producers to quickly map out complex harmonic structures, discover new chord voicings, and build complete arrangements on the fly.

# Chord Progression - Max for Live MIDI device

A MIDI-generator device that turns roman-numeral chord
progressions into MIDI clips on the active track.

## What it does

- Follows Ableton **Live 12**'s global key/scale (live_set root_note /
 scale_name), or use manual Key + Mode dropdowns.
- Type a progression in roman-numeral notation (I - V - vi - IV,
 ii7 - V7 - Imaj7, i - VII - VI - V, slash chords I/V, extensions  dd9,
 qualities sus4/7//+). Numerals are **mode-relative** (in a minor
 scale VII is already the natural-minor 7th;  VII would flatten it further).
- Two-way translation between roman-numeral and absolute-chord notation
 (
omanToAbsolute /  bsoluteToRoman in src/lib/theory/roman.ts).
- Preset progressions with "feeling" labels (major + minor lists).
- **Generate** button = weighted randomizer; the Conventional?Adventurous slider
 raises the probability of sevenths, extensions, borrowed chords and secondary
 dominants.
- Count / Octave / Bars steppers; **Block vs Arp** toggle.
- **Write Clip** creates a MIDI clip in the highlighted slot (or the first empty
 slot on the selected track).

... (Read more on GitHub)
