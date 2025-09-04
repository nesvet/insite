import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";


const distDir = "dist";

const common = {
	format: "esm",
	sourcemap: true
};


new Conveyer([
	
	new ESBuild({
		title: "Backend",
		entryPoints: [ "src/backend/index.ts" ],
		outfile: path.resolve(distDir, "backend/index.js"),
		external: [ true, "insite-*" ],
		platform: "node",
		target: "node20",
		...common
	}),
	
	new ESBuild({
		title: "Frontend",
		entryPoints: [ "src/frontend/index.ts" ],
		outfile: path.resolve(distDir, "frontend/index.js"),
		external: true,
		platform: "neutral",
		target: "es2020",
		...common
	}),
	
	new ESBuild({
		title: "Common",
		entryPoints: [ "src/index.ts" ],
		outfile: path.resolve(distDir, "common/index.js"),
		external: true,
		platform: "node",
		target: "node20",
		...common
	})
	
], {
	initialCleanup: distDir
});
