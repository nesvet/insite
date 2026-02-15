import { StaticMiddleware, StaticMiddlewareOptions } from "./middlewares/Static";
import { HTTPServer } from "./Server";
import { GenericMiddleware, Options } from "./types";


export class StaticServer extends HTTPServer {
	constructor(options: StaticMiddlewareOptions, serverOptions: Options, middlewares: GenericMiddleware[] = []) {
		super(serverOptions, [
			new StaticMiddleware(options),
			...middlewares
		]);
		
	}
	
	name = "Static";
	icon = "🛒";
	
}
