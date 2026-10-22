import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dirname, "..", "packages");
const packages = [];

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

	const dependencies = Object.keys(manifest.dependencies ?? {}).filter(name => name.startsWith("insite-"));

	packages.push({
		dependencies,
		name: manifest.name,
		packageDir,
		version: manifest.version
	});
}

const byName = new Map(packages.map(pkg => [ pkg.name, pkg ]));
const pending = new Map(packages.map(pkg => [
	pkg.name,
	pkg.dependencies.filter(name => byName.has(name))
]));
const order = [];

while (pending.size) {
	const ready = [ ...pending.keys() ].filter(name => pending.get(name).length === 0).sort();

	if (!ready.length) {
		console.error(`dependency cycle: ${[ ...pending.keys() ].join(", ")}`);
		process.exit(1);
	}

	for (const name of ready) {
		order.push(byName.get(name));
		pending.delete(name);

		for (const dependencies of pending.values()) {
			const index = dependencies.indexOf(name);

			if (index !== -1)
				dependencies.splice(index, 1);
		}
	}
}

for (const pkg of order) {
	const view = spawnSync("npm", [ "view", `${pkg.name}@${pkg.version}`, "version" ], {
		encoding: "utf8"
	});
	const published = view.stdout.trim();

	if (view.status === 0 && published === pkg.version) {
		console.log(`skip ${pkg.name}@${pkg.version}`);
		continue;
	}

	const missing = view.status !== 0 && /E404|404 Not Found/.test(view.stderr);

	if (!missing) {
		console.error(view.stderr);
		process.exit(view.status ?? 1);
	}

	const publish = spawnSync("npm", [ "publish", "--access", "public", "--provenance" ], {
		cwd: pkg.packageDir,
		stdio: "inherit"
	});

	if (publish.status !== 0)
		process.exit(publish.status ?? 1);
}
