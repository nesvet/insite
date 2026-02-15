import path from "node:path";
import { Conveyer, ESBuild } from "cnvr";
import { common, neutral, node20 } from "../../conveyer.config.js";


const distDir = "dist";

new Conveyer(
	[
		new ESBuild({
			title: "Backend",
			entryPoints: [ "src/backend/index.ts" ],
			outfile: path.resolve(distDir, "backend/index.js"),
			...common,
			...node20
		}),
		new ESBuild({
			title: "Frontend",
			entryPoints: [ "src/frontend/index.ts" ],
			outfile: path.resolve(distDir, "frontend/index.js"),
			external: true,
			...common,
			...neutral
		}),
		new ESBuild({
			title: "Common",
			entryPoints: [ "src/index.ts" ],
			outfile: path.resolve(distDir, "common/index.js"),
			external: true,
			...common,
			...node20
		})
	],
	{ initialCleanup: distDir }
);
