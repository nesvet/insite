import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Server",
			entryPoints: [ "src/server/index.ts" ],
			outfile: path.resolve(distDir, "server/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		}),
		new ESBuild({
			title: "Client",
			entryPoints: [ "src/client/index.ts" ],
			outfile: path.resolve(distDir, "client/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "neutral",
			target: "es2022"
		}),
		new ESBuild({
			title: "Node Client",
			entryPoints: [ "src/client/node/index.ts" ],
			outfile: path.resolve(distDir, "client/node/index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		})
	],
	{ initialCleanup: distDir }
);
