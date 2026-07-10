/**
 * wrapper.js - Max-side glue for the Chord Progression device (NOT the React
 * app). Runs in Max's [js] object. Responsibilities:
 *
 * 1. Load the React UI (chordprog-ui.html) into the [jweb] object using a
 * file:// URL derived from this patch's own location.
 * 2. Observe Live 12's global key/scale (live_set root_note / scale_name) and
 * forward it to the UI as `scale <root> <name...>`.
 * 3. Receive `write_clip <lengthBeats> <n> <p s d v> ...` from the UI and
 * create a MIDI clip on the selected track via LiveAPI.
 *
 * Outlets:
 * 0 - to jweb ("url <file://…>", then "scale ...")
 * 1 - to print (optional)
 */

autowatch = 1;
inlets = 1;
outlets = 2;

post("wrapper.js loaded\n");

var rootObs = null;
var scaleObs = null;
var liveRoot = 0;
var liveScale = "Major";

function bang() {
	setup();
}

function loadbang() {
	setup();
}

function reload() {
	setup();
}

function setup() {
	teardown();
	loadWebview();
	try {
		rootObs = new LiveAPI(onRoot, "live_set");
		rootObs.property = "root_note";
		scaleObs = new LiveAPI(onScale, "live_set");
		scaleObs.property = "scale_name";
		post("chordprog: scale observers ready\n");
	} catch (e) {
		post("chordprog: scale observers unavailable (pre-Live-12?) " + e.message + "\n");
	}
}

function teardown() {
	rootObs = null;
	scaleObs = null;
}

function loadWebview() {
	try {
		var url = resolveUiUrl();
		if (!url) {
			post("chordprog: chordprog-ui.html not found (search path or device folder)\n");
			return;
		}
		outlet(0, "url", url);
		post("chordprog: sent url " + url + "\n");
	} catch (e) {
		post("chordprog: loadWebview error " + e.message + "\n");
	}
}

/**
 * Locate the UI html and return a file:// URL that Chromium (jweb) can read.
 *
 * The .amxd embeds chordprog-ui.html as a frozen dependency. Max resolves
 * frozen files through a VIRTUAL filesystem - [js] File() can open them, but
 * they never exist as loose files on disk, so jweb (Chromium reading the real
 * disk) cannot load them directly. Solution: read the embedded copy through
 * the Max File API and extract it once next to the .amxd, then point jweb at
 * the extracted file. A loose copy already next to the device (dev layout)
 * is used as-is.
 */
var UI_NAME = "chordprog-ui.html";

function resolveUiUrl() {
	var fp = this.patcher.filepath;
	var devFolder = fp && fp.length ? fp.replace(/\/[^\/]*$/, "") : null;
	if (!devFolder) {
		post("chordprog: patcher not saved yet - UI path unknown\n");
		return null;
	}
	var target = devFolder + "/" + UI_NAME;

	var src = new File(UI_NAME);
	if (!src.isopen) {
		// Not resolvable through the search path: hope a loose copy sits next
		// to the device (pre-embed layout).
		post("chordprog: " + UI_NAME + " not in search path, trying " + target + "\n");
		return encodeURI("file:///" + target);
	}
	var srcFolder = src.foldername.replace(/\\/g, "/");
	post("chordprog: search path found " + UI_NAME + " in " + srcFolder + "\n");
	if (srcFolder.toLowerCase() === devFolder.toLowerCase()) {
		// Already a real loose file next to the device - use it directly.
		src.close();
	} else {
		// Inside the frozen .amxd (virtual path) - extract next to the device.
		extractIfNeeded(src, target);
		src.close();
	}
	return encodeURI("file:///" + target);
}

/** Copy `src` (open Max File) to targetPath unless an identical-size copy exists. */
function extractIfNeeded(src, targetPath) {
	try {
		var existing = new File(targetPath);
		if (existing.isopen) {
			var sameSize = existing.eof === src.eof;
			existing.close();
			if (sameSize) return; // already extracted, same build
		}
	} catch (e) {
		/* fall through to (re)write */
	}
	try {
		var out = new File(targetPath, "write");
		if (!out.isopen) out.open();
		if (!out.isopen) {
			post("chordprog: cannot write " + targetPath + "\n");
			return;
		}
		out.eof = 0;
		src.position = 0;
		var CHUNK = 16384;
		while (src.position < src.eof) {
			var n = Math.min(CHUNK, src.eof - src.position);
			out.writebytes(src.readbytes(n));
		}
		out.close();
		post("chordprog: extracted UI (" + src.eof + " bytes) to " + targetPath + "\n");
	} catch (e2) {
		post("chordprog: extract failed - " + e2.message + "\n");
	}
}

function onRoot(a) {
	if (a && a.length >= 2 && a[0] == "root_note") {
		liveRoot = a[1];
		sendScale();
	}
}

function onScale(a) {
	if (a && a.length >= 2 && a[0] == "scale_name") {
		liveScale = a.slice(1).join(" ");
		sendScale();
	}
}

function sendScale() {
	outlet(0, "scale", liveRoot, liveScale);
}

/**
 * write_clip <lengthBeats> <n> <p1 s1 d1 v1> <p2 s2 d2 v2> ...
 * Creates a clip in the highlighted slot (or the first empty slot on the
 * selected track) and fills it with the given notes.
 */
function write_clip() {
	var a = arrayfromargs(arguments);
	if (a.length < 2) {
		post("chordprog: write_clip missing args\n");
		return;
	}
	var lengthBeats = a[0];
	var n = a[1];

	var slot = getTargetSlot();
	if (!slot) return;

	slot.call("create_clip", lengthBeats);
	var clip = new LiveAPI(slot.unquotedpath + " clip");

	var notes = [];
	for (var k = 0; k < n; k++) {
		var o = 2 + k * 4;
		notes.push({
			pitch: a[o],
			start_time: a[o + 1],
			duration: a[o + 2],
			velocity: a[o + 3],
			mute: 0,
		});
	}

	if (!addNotes(clip, notes)) {
		post("chordprog: failed to add notes\n");
		return;
	}
	clip.set("name", "ChordProg");
	outlet(0, "clip_written", 1);
	post("chordprog: wrote " + n + " notes over " + lengthBeats + " beats\n");
}

function getTargetSlot() {
	try {
		var slot = new LiveAPI("live_set view highlighted_clip_slot");
		if (slot && slot.id && slot.id != 0 && parseInt(slot.get("has_clip")) === 0) {
			return slot;
		}
		// Fall back to the first empty slot on the selected track.
		var track = new LiveAPI("live_set view selected_track");
		var count = parseInt(track.getcount("clip_slots"));
		for (var i = 0; i < count; i++) {
			var s = new LiveAPI(track.unquotedpath + " clip_slots " + i);
			if (parseInt(s.get("has_clip")) === 0) return s;
		}
		post("chordprog: no empty clip slot on selected track\n");
		return null;
	} catch (e) {
		post("chordprog: getTargetSlot error " + e.message + "\n");
		return null;
	}
}

/**
 * Add notes using the Live 11+ dictionary API, falling back to the legacy
 * set_notes/note/done sequence if the modern call is rejected.
 */
function addNotes(clip, notes) {
	try {
		clip.call("add_new_notes", { notes: notes });
		return true;
	} catch (e) {
		post("chordprog: add_new_notes failed, trying legacy - " + e.message + "\n");
	}
	try {
		clip.call("set_notes");
		clip.call("notes", notes.length);
		for (var i = 0; i < notes.length; i++) {
			var nt = notes[i];
			clip.call("note", nt.pitch, nt.start_time, nt.duration, nt.velocity, nt.mute);
		}
		clip.call("done");
		return true;
	} catch (e2) {
		post("chordprog: legacy set_notes failed - " + e2.message + "\n");
		return false;
	}
}
