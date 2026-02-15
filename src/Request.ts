import { IncomingMessage } from "node:http";
import querystring from "node:querystring";
import { getRemoteAddress } from "insite-common/backend";
import { matchSymbol } from "./symbols";
import { extractBearerToken, extractQueryParams, extractUrlParams } from "./utils";
import type { RequestParams, RequestQueryParams } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any, @stylistic/max-statements-per-line */


export function matches(request: Request, regExp: RegExp) {
	const match = regExp.exec(request.path);
	
	if (match) {
		request[matchSymbol] = match;
		
		return true;
	}
	
	return false;
}


export class RequestBody {
	constructor(request: Request<any>) {
		this.#request = request;
		
	}
	
	#request;
	
	/** Request body as a ReadableStream */
	stream() {
		return this.#request;
	}
	
	#text?: string;
	
	/** Request body as a string */
	text() {
		return new Promise<string>((resolve, reject) => {
			
			if (this.#text)
				resolve(this.#text);
			else {
				let text = "";
				
				this.#request.on("data", chunk => { text += chunk; });
				this.#request.on("end", () => { resolve(this.#text = text); });
				
				this.#request.on("error", reject);
			}
			
		});
	}
	
	#bytes?: Uint8Array<ArrayBufferLike>;
	
	/** Request body as an Uint8Array */
	async bytes() {
		
		this.#bytes ??= new TextEncoder().encode(await this.text());
		
		return this.#bytes;
	}
	
	/** Request body as an ArrayBuffer */
	async arrayBuffer() {
		return (await this.bytes()).buffer;
	}
	
	#json?: any;
	
	/** Request body as a parsed JSON object */
	async json() {
		
		this.#json ??= JSON.parse(await this.text() || "null");
		
		return this.#json;
	}
	
	#urlEncoded?: querystring.ParsedUrlQuery;
	
	/** Request body as a parsed URL-encoded object */
	async urlEncoded() {
		
		this.#urlEncoded = querystring.parse(await this.text());
		
		return this.#urlEncoded;
	}
	
	// TODO:
	/** Request body as a parsed MessagePack object */
	// messagePack() {
	// }
	
}


export class Request<P = RequestParams> extends IncomingMessage {
	
	declare url: string;
	
	/** Pathname part of the URL string */
	path!: string;
	
	/** Query string part of the URL string */
	querystring!: string;
	
	#ip?: string;
	
	/** IPv4 */
	get ip() {
		return (this.#ip ??= getRemoteAddress(this));
	}
	
	[matchSymbol]?: RegExpExecArray;
	
	#params?: P;
	
	/** Params parsed from the URL string */
	get params() {
		return (this.#params ??= extractUrlParams(this) as P);
	}
	
	#query?: RequestQueryParams;
	
	/** Params parsed from the query string part of the URL string */
	get query() {
		return (this.#query ??= extractQueryParams(this));
	}
	
	#bearer?: string | null;
	
	/** Authorization: Bearer token */
	get bearer() {
		return (this.#bearer ??= extractBearerToken(this));
	}
	
	#body?: RequestBody;
	
	/** Object with async methods to get the request body */
	get body() {
		return (this.#body ??= new RequestBody(this));
	}
	
}
