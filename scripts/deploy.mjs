import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const FILES = ["main.js", "manifest.json", "styles.css"];

function findVault() {
	const fromArg = process.argv[2];
	if (fromArg) return fromArg;

	const fromEnv = process.env.OBSIDIAN_VAULT;
	if (fromEnv) return fromEnv;

	const configFile = resolve(process.cwd(), "vault-path.txt");
	if (existsSync(configFile)) return readFileSync(configFile, "utf8").trim();

	return null;
}

const vault = findVault();
if (!vault) {
	console.error(
		"Usage: npm run deploy -- <path-to-vault>\n" +
			"  or set the OBSIDIAN_VAULT environment variable,\n" +
			"  or create a file named vault-path.txt containing the vault path.",
	);
	process.exit(1);
}

const vaultPath = resolve(vault);
if (!existsSync(join(vaultPath, ".obsidian"))) {
	console.error(`Not an Obsidian vault (no .obsidian folder found): ${vaultPath}`);
	process.exit(1);
}

if (!existsSync("main.js")) {
	console.error("main.js not found. Run `npm run build` first.");
	process.exit(1);
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const dest = join(vaultPath, ".obsidian", "plugins", manifest.id);
mkdirSync(dest, { recursive: true });

for (const file of FILES) {
	copyFileSync(file, join(dest, file));
	console.log(`copied ${file} -> ${dest}`);
}

console.log(`\nDone. Reload Obsidian and enable "${manifest.name}" in Settings > Community plugins.`);
