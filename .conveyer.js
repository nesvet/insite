import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

const common = {
	external: [ true, "insite-*" ],
	platform: "node",
	format: "esm",
	sourcemap: true,
	target: "node20"
};


new Conveyer([
	
	new ESBuild({
		title: "index",
		entryPoints: [ "src/index.ts" ],
		outfile: path.resolve(distDir, "index.js"),
		...common
	}),
	
	new ESBuild({
		title: "ws",
		entryPoints: [ "src/ws/index.ts" ],
		outfile: path.resolve(distDir, "ws/index.js"),
		...common
	})
	
], {
	initialCleanup: distDir
});
