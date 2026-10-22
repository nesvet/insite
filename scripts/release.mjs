import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dirname, "..", "packages");

for (const entry of readdirSync(packagesDir)) {
	const packageDir = join(packagesDir, entry);
	const packageJsonPath = join(packageDir, "package.json");

	let manifest;

	try {
		manifest = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	} catch {
		continue;
	}

	if (!manifest.name || !manifest.version || manifest.private)
		continue;

	const view = spawnSync("npm", [ "view", `${manifest.name}@${manifest.version}`, "version" ], {
		encoding: "utf8"
	});
	const published = view.stdout.trim();

	if (view.status === 0 && published === manifest.version) {
		console.log(`skip ${manifest.name}@${manifest.version}`);
		continue;
	}

	const missing = view.status !== 0 && /E404|404 Not Found/.test(view.stderr);

	if (!missing) {
		console.error(view.stderr);
		process.exit(view.status ?? 1);
	}

	const publish = spawnSync("npm", [ "publish", "--access", "public", "--provenance" ], {
		cwd: packageDir,
		stdio: "inherit"
	});

	if (publish.status !== 0)
		process.exit(publish.status ?? 1);
}
