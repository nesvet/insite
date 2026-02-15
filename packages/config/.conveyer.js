import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, node20 } from "../../conveyer.config.js";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			entryPoints: [ "src/index.ts" ],
			outfile: path.resolve(distDir, "index.js"),
			platform: "node",
			...common,
			...node20
		})
	],
	{ initialCleanup: distDir }
);
