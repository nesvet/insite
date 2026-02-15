import type http from "node:http";
import type https from "node:https";
import type { Readable } from "node:stream";
import type { ClassMiddleware } from "./Middleware";
import type { Request } from "./Request";
import type { Response } from "./Response";


const METHODS = [ "DELETE", "GET", "PATCH", "POST", "PUT" ] as const;

export type Method = typeof METHODS[number];

export function isMethod(string: string): string is Method | "ALL" {
	return METHODS.includes(string as Method) || string === "ALL";
}

export type Next<R = unknown> = () => Promise<R>;

export type Priority = number;

export type Handler = (request: Request, response: Response, next: Next) => unknown;

export type Listener = [ RegExp, Handler, Priority ];

export type Options = {
	
	/**
	 * Icon for console logs
	 * @default "🕸️ "
	 */
	icon?: string;
	
	/**
	 * Name
	 * @default "HTTP"
	 */
	name?: string;
	
	ssl?: {
		cert: Buffer | string;
		key: Buffer | string;
	};
	port?: number | string;
	https?: boolean;
	listeners?: Partial<Record<Method | "ALL", Listener[]>>;
	errors?: Record<"default" | number, ErrorParams>;
	server?: http.Server | http.ServerOptions | https.Server | https.ServerOptions;
};

export type RegExpOrString = RegExp | string;

export type RequestParams = Record<string, string> & [ undefined, ...string[] ];

export type RequestQueryParams = Record<string, string>;

export type Middleware = {
	[K: string]: Handler | Middleware;
} | {
	[K: {} & string]: Handler | Middleware;
} | {
	[K in Method | "ALL"]?: Middleware;
};

export type TupleMiddleware = readonly [ Method, RegExpOrString, Handler, Priority? ] | readonly [ RegExpOrString, Handler, Priority? ];

export type GenericMiddleware =
	ClassMiddleware |
	Middleware |
	TupleMiddleware |
	TupleMiddleware[];

export function isTupleMiddlewareOrArray(middleware: GenericMiddleware): middleware is TupleMiddleware | TupleMiddleware[] {
	return Array.isArray(middleware);
}

export function isTupleMiddleware(middleware: TupleMiddleware | TupleMiddleware[]): middleware is TupleMiddleware {
	return !Array.isArray(middleware);
}

export function isRequestMethodAccepted(requestMethod: string | undefined, listeners: Record<string, unknown>): requestMethod is Method {
	return Boolean(requestMethod && listeners[requestMethod]);
}

export function isServerServer(serverOrOptions: Options["server"]): serverOrOptions is http.Server | https.Server {
	return !!serverOrOptions && "emit" in serverOrOptions;
}

export type ResponseHeaders = http.OutgoingHttpHeader[] | http.OutgoingHttpHeaders;

export type JSONResponseBody = Parameters<JSON["stringify"]>[0];

export type UrlEncodedResponseBody = ConstructorParameters<typeof URLSearchParams>[0];

export type ResponseBody = JSONResponseBody | Readable | UrlEncodedResponseBody | string;// eslint-disable-line @typescript-eslint/no-redundant-type-constituents

export type ErrorParams = {
	statusCode: number;
	headers?: ResponseHeaders;
	body: ResponseBody;
	handler?: ErrorHandler;
};

export type ErrorHandler = (request: Request, response: Response, errorParams: Omit<ErrorParams, "handler">) => Response;
