import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

const common = {
	format: "esm",
	sourcemap: true
};


new Conveyer([
	
	new ESBuild({
		title: "Server",
		entryPoints: [ "src/server/index.ts" ],
		outfile: path.resolve(distDir, "server/index.js"),
		external: [ true, "insite-*" ],
		platform: "node",
		target: "node22",
		...common
	}),
	
	new ESBuild({
		title: "Client",
		entryPoints: [ "src/client/index.ts" ],
		outfile: path.resolve(distDir, "client/index.js"),
		external: true,
		platform: "neutral",
		target: "es2020",
		...common
	}),
	
	new ESBuild({
		title: "Node Client",
		entryPoints: [ "src/client/node/index.ts" ],
		outfile: path.resolve(distDir, "client/node/index.js"),
		external: true,
		platform: "node",
		target: "node22",
		...common
	})
	
], {
	initialCleanup: distDir
});
