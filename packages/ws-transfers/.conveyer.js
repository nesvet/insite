import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const { NODE_ENV } = process.env;
const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Node",
			entryPoints: [ "src/node/index.ts" ],
			outfile: path.resolve(distDir, "node", "index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		}),
		new ESBuild({
			title: "Browser",
			entryPoints: [ "src/browser/index.ts" ],
			outfile: path.resolve(distDir, "browser", "index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "neutral",
			target: "es2022",
			define: { "process.env.NODE_ENV": JSON.stringify(NODE_ENV) }
		})
	],
	{ initialCleanup: distDir }
);
