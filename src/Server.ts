import type http from "node:http";
import type https from "node:https";
import { createServer, resolveSSL, showServerListeningMessage } from "insite-common/backend";
import { ClassMiddleware } from "./Middleware";
import { matches, Request } from "./Request";
import { Response } from "./Response";
import { requestSymbol, serverSymbol } from "./symbols";
import {
	isMethod,
	isRequestMethodAccepted,
	isServerServer,
	isTupleMiddleware,
	isTupleMiddlewareOrArray,
	type ErrorParams,
	type GenericMiddleware,
	type Handler,
	type Listener,
	type Method,
	type Middleware,
	type Options,
	type Priority,
	type RegExpOrString,
	type ResponseBody
} from "./types";
import { pathToRegExp } from "./utils";


export class HTTPServer {
	constructor({
		icon = "🕸️ ",
		name = "HTTP",
		port,
		ssl,
		listeners,
		errors,
		server
	}: Options, middlewares: (GenericMiddleware | false | null | undefined)[] = []) {
		
		this.icon = icon;
		this.name = name;
		
		if (isServerServer(server)) {
			this.server = server;
			
			void new Promise<void>(resolve => void (
				server.listening ?
					resolve() :
					server.on("listening", resolve)
			)).then(() => showServerListeningMessage(this));
			
		} else {
			this.server = createServer(HTTPServer.makeProps({ ssl, server }));
			
			this.server.listen(
				typeof port == "string" ?
					Number.parseInt(port) :
					port ?? (this.isS ? 443 : 80),
				() => showServerListeningMessage(this)
			);
		}
		
		if (listeners)
			for (const [ method, methodListeners ] of Object.entries(listeners) as [ Method | "ALL", Listener[] ][])
				for (const [ regExp, handler, priority ] of methodListeners)
					this.addRequestListener(method, regExp, handler, priority);
		
		if (errors)
			for (const statusCodeString of Object.keys(errors)) {
				const statusCode = Number.parseInt(statusCodeString);
				if (statusCode)
					if (this.#errors[statusCode])
						Object.assign(this.#errors[statusCode], errors[statusCode]);
					else
						this.#errors[statusCode] = errors[statusCode];
			}
		
		if (middlewares)
			for (const middleware of middlewares)
				if (middleware)
					this.addMiddleware(middleware);
		
		this.server.on("request", this.#requestListener);
		
	}
	
	icon;
	name;
	get protocol() {
		return `http${this.isS ? "s" : ""}`;
	}
	
	/** Node.js http(s) server object */
	server;
	
	/** Does the server use SSL */
	get isS() {
		return "setSecureContext" in this.server;
	}
	
	#listeners: Record<Method, Listener[]> = {
		POST: [],
		GET: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	
	#requestListener: Handler = async (request, response) => {
		
		([
			request.path,
			request.querystring
		] = request.url.split("?", 2));
		
		response[serverSymbol] = this;
		response[requestSymbol] = request;
		
		if (!("status" in request) && isRequestMethodAccepted(request.method, this.#listeners)) {
			const stack = this.#listeners[request.method];
			let i = 0;
			
			const next = async () => {
				
				while (i < stack.length) {
					const listener = stack[i++];
					
					if (matches(request, listener[0]))
						return await listener[1](request, response, next);
				}
				
			};
			
			return await next();
		}
		
		response.notFound();
		
	};
	
	#errors: Record<"default" | number, ErrorParams> = {
		401: {
			statusCode: 401,
			body: "Unauthorized"
		},
		403: {
			statusCode: 403,
			body: "Forbidden"
		},
		404: {
			statusCode: 404,
			body: "Not Found"
		},
		408: {
			statusCode: 408,
			body: "Request Timeout"
		},
		410: {
			statusCode: 410,
			body: "Gone"
		},
		500: {
			statusCode: 500,
			body: "Internal Server Error"
		},
		503: {
			statusCode: 503,
			body: "Service Unavailable"
		},
		default: {
			statusCode: 400,
			body: "Bad Request",
			handler(request, response, { statusCode, headers, body }) {
				return response.give(body, headers, statusCode);
			}
		}
	};
	
	_throw(response: Response, { statusCode, ...restParams }: Omit<ErrorParams, "body"> & { body?: ResponseBody }) {
		
		const {
			handler,
			...handlerParams
		} = {
			...this.#errors.default,
			...this.#errors[statusCode],
			...restParams
		};
		
		return handler!(response[requestSymbol], response, handlerParams);
	}
	
	#getWeight(regExp: RegExp, priority: number) {
		const source = regExp.source.replace(/\\\/\??\$?$/, "");
		
		let depth = 0;
		let wildcards = 0;
		
		for (let i = 0, { length } = source; i < length; i++)
			switch (source[i]) {
				case "/":
					depth++;
					break;
				
				case "*":
					wildcards++;
					break;
			}
		
		return (priority * 1000) + ((depth * 10) - wildcards);
	}
	
	/** Add request listener */
	addRequestListener(method: Method | "ALL", regExp: RegExpOrString, handler: Handler, priority = 0) {
		if (typeof regExp == "string")
			regExp = pathToRegExp(regExp);
		
		if (method && method !== "ALL") {
			const methodListeners = this.#listeners[method];
			
			if (methodListeners) {
				const listener: Listener = [ regExp, handler, priority ];
				const weight = this.#getWeight(regExp, priority);
				
				for (let i = 0; i < methodListeners.length; i++) {
					const [ anotherRegExp, , anotherPriority ] = methodListeners[i];
					
					if (weight > this.#getWeight(anotherRegExp, anotherPriority)) {
						methodListeners.splice(i, 0, listener);
						break;
					}
				}
				
				if (!methodListeners.includes(listener))
					methodListeners.push(listener);
			}
		} else
			for (const specificMethod of Object.keys(this.#listeners) as Method[])
				this.addRequestListener(specificMethod, regExp, handler, priority);
		
		return this;
	}
	
	/** Add middleware */
	addMiddleware(middleware: GenericMiddleware, priority?: Priority) {
		if (middleware instanceof ClassMiddleware) {
			for (const [ method, regExpOrStringArrayMap ] of Object.entries(middleware.listeners))
				for (const [ regExpOrString, handler, listenerPriority ] of regExpOrStringArrayMap)
					this.addRequestListener(method as Method, regExpOrString, handler, listenerPriority ?? priority ?? middleware.priority);
			middleware.bindTo?.(this);
		} else if (isTupleMiddlewareOrArray(middleware)) {
			if (isTupleMiddleware(middleware))
				middleware = [ middleware ];
			
			for (const params of middleware)
				this.addRequestListener(
					...isMethod(params[0] as string) ?
						params as readonly [ Method, RegExpOrString, Handler, Priority? ] :
						[ "GET", ...params as [ RegExpOrString, Handler, Priority? ] ] as const
				);
		} else
			this.#parseMappedMiddleware(middleware);
		
		return this;
	}
	
	#parseMappedMiddleware(middleware: Middleware, method: Method | "ALL" = "GET", prefix: string = "") {
		for (const [ key, value ] of Object.entries(middleware))
			if (typeof value == "function")
				if (isMethod(key))
					this.addRequestListener(key, prefix, value);
				else
					this.addRequestListener(method, `${prefix}${key}`, value);
			else
				if (isMethod(key))
					this.#parseMappedMiddleware(value, key, prefix);
				else
					this.#parseMappedMiddleware(value, method, `${prefix}${key}`);
		
	}
	
	/** Add POST request listener */
	post(regExp: RegExpOrString, handler: Handler, priority?: Priority) {
		this.addRequestListener("POST", regExp, handler, priority);
		
		return this;
	}
	
	/** Add GET request listener */
	get(regExp: RegExpOrString, handler: Handler, priority?: Priority) {
		this.addRequestListener("GET", regExp, handler, priority);
		
		return this;
	}
	
	/** Add PUT request listener */
	put(regExp: RegExpOrString, handler: Handler, priority?: Priority) {
		this.addRequestListener("PUT", regExp, handler, priority);
		
		return this;
	}
	
	/** Add PATCH request listener */
	patch(regExp: RegExpOrString, handler: Handler, priority?: Priority) {
		this.addRequestListener("PATCH", regExp, handler, priority);
		
		return this;
	}
	
	/** Add DELETE request listener */
	delete(regExp: RegExpOrString, handler: Handler, priority?: Priority) {
		this.addRequestListener("DELETE", regExp, handler, priority);
		
		return this;
	}
	
	
	/** Make props for Node.js http(s).createServer method */
	static makeProps({ ssl, server }: Options) {
		return {
			...resolveSSL(ssl),
			IncomingMessage: Request,
			ServerResponse: Response,
			...server
		} as http.ServerOptions | https.ServerOptions;
	}
	
}
