import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const { NODE_ENV } = process.env;
const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Server",
			entryPoints: [ "src/server/index.ts" ],
			outfile: path.resolve(distDir, "server", "index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		}),
		new ESBuild({
			title: "Client",
			entryPoints: [ "src/client/index.ts" ],
			outfile: path.resolve(distDir, "client", "index.js"),
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
