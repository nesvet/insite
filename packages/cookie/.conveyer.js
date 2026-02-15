import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, neutral, node20 } from "../../conveyer.config.js";


const { NODE_ENV } = process.env;
const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Server",
			entryPoints: [ "src/server/index.ts" ],
			outfile: path.resolve(distDir, "server", "index.js"),
			...common,
			...node20
		}),
		new ESBuild({
			title: "Client",
			entryPoints: [ "src/client/index.ts" ],
			outfile: path.resolve(distDir, "client", "index.js"),
			external: true,
			define: { "process.env.NODE_ENV": JSON.stringify(NODE_ENV) },
			...common,
			...neutral
		})
	],
	{ initialCleanup: distDir }
);
