import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, neutral } from "../../conveyer.config.js";


const { NODE_ENV } = process.env;
const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			entryPoints: [ "src/index.ts" ],
			outfile: path.resolve(distDir, "index.js"),
			define: { "process.env.NODE_ENV": JSON.stringify(NODE_ENV) },
			...common,
			...neutral
		})
	],
	{ initialCleanup: distDir }
);
