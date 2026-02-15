import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, neutral, node20 } from "../../conveyer.config.js";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Server",
			entryPoints: [ "src/server/index.ts" ],
			outfile: path.resolve(distDir, "server/index.js"),
			...common,
			...node20
		}),
		new ESBuild({
			title: "Client",
			entryPoints: [ "src/client/index.ts" ],
			outfile: path.resolve(distDir, "client/index.js"),
			external: true,
			...common,
			...neutral
		}),
		new ESBuild({
			title: "Node Client",
			entryPoints: [ "src/client/node/index.ts" ],
			outfile: path.resolve(distDir, "client/node/index.js"),
			external: true,
			...common,
			...node20
		})
	],
	{ initialCleanup: distDir }
);
