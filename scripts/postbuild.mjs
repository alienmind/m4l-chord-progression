/**
 * Runs after `vite build`. Assembles the final dist/ output:
 * 1. Rename dist/index.html → dist/chordprog-ui.html
 * 2. Copy ableton-amxd/ChordProgression.amxd → dist/ (if present)
 * 3. Copy chordprog.js (root) → dist/
 * 4. Create m4l-chord-progression-dist.zip (release archive)
 */
import archiver from "archiver";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { rename, copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await rename(path.join(dist, "index.html"), path.join(dist, "chordprog-ui.html"));
console.log("postbuild: dist/index.html → dist/chordprog-ui.html");

const amxdSrc = path.join(root, "ableton-amxd", "ChordProgression.amxd");
if (existsSync(amxdSrc)) {
	await copyFile(amxdSrc, path.join(dist, "ChordProgression.amxd"));
	console.log("postbuild: ableton-amxd/ChordProgression.amxd → dist/");
} else {
	console.log("postbuild: ableton-amxd/ChordProgression.amxd not found (create it in Max) - skipping");
}

await copyFile(path.join(root, "chordprog.js"), path.join(dist, "chordprog.js"));
console.log("postbuild: chordprog.js → dist/chordprog.js");

const zipPath = path.join(root, "m4l-chord-progression-dist.zip");
await new Promise((resolve, reject) => {
	const output = createWriteStream(zipPath);
	const archive = archiver("zip", { zlib: { level: 9 } });
	output.on("close", resolve);
	archive.on("error", reject);
	archive.pipe(output);
	for (const f of ["ChordProgression.amxd", "chordprog.js", "chordprog-ui.html"]) {
		const p = path.join(dist, f);
		if (existsSync(p)) archive.append(createReadStream(p), { name: `ChordProgression/${f}` });
	}
	archive.finalize();
});
const { size } = await stat(zipPath);
console.log(`postbuild: m4l-chord-progression-dist.zip (${size} bytes)`);
