import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { id, version } = manifest;

const dist = join("dist", id);
mkdirSync(dist, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
	if (!existsSync(file)) {
		console.error(`${file} not found. Run \`npm run build\` first.`);
		process.exit(1);
	}
	copyFileSync(file, join(dist, file));
}

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
if (!(version in versions)) {
	versions[version] = manifest.minAppVersion;
	writeFileSync("versions.json", `${JSON.stringify(versions, null, "\t")}\n`);
	console.log(`added ${version} to versions.json`);
}

const zipPath = join("dist", `${id}-${version}.zip`);
execFileSync("powershell", [
	"-NoProfile",
	"-Command",
	`Compress-Archive -Path '${dist.replace(/\\/g, "/")}/*' -DestinationPath '${zipPath.replace(/\\/g, "/")}' -Force`,
]);

console.log(`\nArtifacts ready in ${dist}:`);
console.log(`  main.js, manifest.json, styles.css`);
console.log(`  zip: ${zipPath}`);
console.log(`\nTo publish: create a GitHub release with tag "${version}" (no "v" prefix)`);
console.log(`and upload main.js, manifest.json, styles.css as release assets.`);
