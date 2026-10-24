import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "index",
			entryPoints: [ "src/index.ts" ],
			outfile: path.resolve(distDir, "index.js"),
			format: "esm",
			sourcemap: true,
			external: [ true, "insite-*" ],
			platform: "node",
			target: "node22"
		})
	],
	{ initialCleanup: distDir }
);
