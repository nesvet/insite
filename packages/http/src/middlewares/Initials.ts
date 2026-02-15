//#if _SERVER && _SSR
// import { initialsMap } from "@insite/subscriptions";
// import { handleRequestCompressed } from "../compression";
// import { Middleware } from "../Middleware";


// const headers = { "Content-Type": "text/javascript; charset=utf-8" };


// export class InitialsMiddleware extends Middleware {
// 	constructor(options = {}) {
// 		super();
// 		const {
// 			path = "/initials"
// 		} = options;

// 		this.listeners = {
// 			GET: [ [ path, this.handler ] ]
// 		};

// 	}

// 	handler = (request, response) => {
// 		const initials = initialsMap.getWithTimeout(request.url.split("?")[1]);

// 		if (initials)
// 			handleRequestCompressed(request, response, headers, `window.__initials = [${initials.join()}];\ndocument.currentScript.remove();`);
// 		else
// 			return false;
// 	};

// }


//#else
export const InitialsMiddleware = undefined;


//#endif
