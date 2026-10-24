import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Backend",
			entryPoints: [ "src/backend/index.ts" ],
			outfile: path.resolve(distDir, "backend/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		}),
		new ESBuild({
			title: "Frontend",
			entryPoints: [ "src/frontend/index.ts" ],
			outfile: path.resolve(distDir, "frontend/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "neutral",
			target: "es2022"
		}),
		new ESBuild({
			title: "Common",
			entryPoints: [ "src/index.ts" ],
			outfile: path.resolve(distDir, "common/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		})
	],
	{ initialCleanup: distDir }
);
