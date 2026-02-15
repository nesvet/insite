import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, neutral, node20 } from "../../conveyer.config.js";


const { NODE_ENV } = process.env;
const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Node",
			entryPoints: [ "src/node/index.ts" ],
			outfile: path.resolve(distDir, "node", "index.js"),
			...common,
			...node20
		}),
		new ESBuild({
			title: "Browser",
			entryPoints: [ "src/browser/index.ts" ],
			outfile: path.resolve(distDir, "browser", "index.js"),
			external: true,
			define: { "process.env.NODE_ENV": JSON.stringify(NODE_ENV) },
			...common,
			...neutral
		})
	],
	{ initialCleanup: distDir }
);
