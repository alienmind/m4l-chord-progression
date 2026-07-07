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
		var fp = this.patcher.filepath;
		if (!fp || !fp.length) {
			post("chordprog: patcher not saved yet - UI path unknown\n");
			return;
		}
		var folder = fp.replace(/\/[^\/]*$/, "");
		var url = encodeURI("file:///" + folder + "/chordprog-ui.html");
		outlet(0, "url", url);
		post("chordprog: sent url " + url + "\n");
	} catch (e) {
		post("chordprog: loadWebview error " + e.message + "\n");
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
