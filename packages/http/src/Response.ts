import { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { cleanup } from "@nesvet/n";
import { requestSymbol, serverSymbol } from "./symbols";
import type { Request } from "./Request";
import type { HTTPServer } from "./Server";
import type {
	ErrorHandler,
	JSONResponseBody,
	ResponseBody,
	ResponseHeaders,
	UrlEncodedResponseBody
} from "./types";


export class Response extends ServerResponse<Request> {
	
	[serverSymbol]!: HTTPServer;
	[requestSymbol]!: Request;
	
	/** Set status code */
	status(code: number) {
		this.statusCode = code;
		
		return this;
	}
	
	/** Set status code */
	set(headers: Record<string, string[] | string>): this;
	set(header: string, value: string[] | string): this;
	set(header: Record<string, string[] | string> | string, value?: string[] | string) {
		if (typeof header == "string")
			return this.setHeader(header, value!);
		
		// eslint-disable-next-line guard-for-in
		for (const key in header)
			this.setHeader(key, header[key]);
		
		return this;
	}
	
	header = this.set;
	
	/** End response with a plain text */
	text(body: string, statusCode = 200) {
		return this.writeHead(statusCode, {
			"Content-Type": "text/plain; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with a JSON string */
	json(value: JSONResponseBody, statusCode = 200) {
		const body = JSON.stringify(value) ?? "{}";
		
		return this.writeHead(statusCode, {
			"Content-Type": "application/json; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with an URL-encoded string */
	urlEncoded(params: UrlEncodedResponseBody, statusCode = 200) {
		const body = new URLSearchParams(params).toString();
		
		return this.writeHead(statusCode, {
			"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
			"Content-Length": Buffer.byteLength(body)
		}).end(body);
	}
	
	/** End response with a stream */
	stream(stream: Readable, statusCode?: number): this;
	stream(stream: Readable, headers?: ResponseHeaders, statusCode?: number): this;
	stream(stream: Readable, headers?: ResponseHeaders | number, statusCode = 200) {
		if (typeof headers == "number") {
			statusCode = headers;
			headers = undefined;
		}
		
		this.writeHead(statusCode, headers);
		
		return stream.pipe(this);
	}
	
	/** End response depend on the type of the passed body */
	give(body: ResponseBody, statusCode?: number): this;
	give(body: ResponseBody, headers?: ResponseHeaders, statusCode?: number): this;
	give(body: ResponseBody, headers?: ResponseHeaders | number, statusCode = 200) {
		if (typeof headers == "number") {
			statusCode = headers;
			headers = undefined;
		}
		
		return (
			typeof body == "string" ?
				this.text(body, statusCode) :
				body instanceof Readable ?
					this.stream(body, headers, statusCode) :
					this.json(body, statusCode)
		);
	}
	
	// TODO:
	// messagePack() {
	// }
	
	/** End response with an error */
	error(statusCode: number, body?: ResponseBody, { headers, handler }: { headers?: ResponseHeaders; handler?: ErrorHandler } = {}) {
		return this[serverSymbol]._throw(this, cleanup({ statusCode, headers, body, handler }));
	}
	
	/** End response with the 400 Bad Request */
	badRequest(body?: ResponseBody) {
		return this.error(400, body);
	}
	
	/** End response with the 401 Unauthorized */
	unauthorized(body?: ResponseBody) {
		return this.error(401, body);
	}
	
	/** End response with the 403 Forbidden */
	forbidden(body?: ResponseBody) {
		return this.error(403, body);
	}
	
	/** End response with the 404 Not Found */
	notFound(body?: ResponseBody) {
		return this.error(404, body);
	}
	
	/** End response with the 408 Request Timeout */
	requestTimeout(body?: ResponseBody) {
		return this.error(408, body);
	}
	
	/** End response with the 410 Gone */
	gone(body?: ResponseBody) {
		return this.error(410, body);
	}
	
	/** End response with the 500 Internal Server Error */
	internalServerError(body?: ResponseBody) {
		return this.error(500, body);
	}
	
	/** End response with the 503 Service Unavailable */
	serviceUnavailable(body?: ResponseBody) {
		return this.error(503, body);
	}
	
}
