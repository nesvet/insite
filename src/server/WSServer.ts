import type http from "node:http";
import type https from "node:https";
import { WebSocketServer } from "ws";
import {
	createServer,
	getRemoteAddress,
	resolveSSL,
	showServerListeningMessage
} from "insite-common/backend";
import { isQuietSymbol, requestListenersSymbol } from "./symbols";
import { WSServerClient } from "./WSServerClient";
import type { Options, RequestListener } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class WSServer<WSSC extends WSServerClient = WSServerClient> extends WebSocketServer<typeof WSServerClient> {
	constructor(options: Options<WSSC>) {
		const {
			icon = "🔌",
			name = "WS",
			ssl: _,
			port,
			server = createServer(WSServer.makeProps(options)),
			quiet = false,
			...wssOptions
		} = options;
		
		super({
			WebSocket: WSServerClient,
			...wssOptions,
			server
		});
		
		this.icon = icon;
		this.name = name;
		
		this.server = server;
		
		if (options.server)
			void new Promise<void>(resolve => void (
				server.listening ?
					resolve() :
					server.on("listening", resolve)
			)).then(() => showServerListeningMessage(this));
		else
			this.server.listen(
				typeof port == "string" ?
					Number.parseInt(port) :
					port ?? (this.isS ? 443 : 80),
				() => showServerListeningMessage(this)
			);
		
		this[isQuietSymbol] = quiet;
		
		this.on("connection", this.#handleConnection);
		
		if (!this[isQuietSymbol]) {
			this.on("error", (error: Error) => console.error(`${this.icon}❗️ WS Server:`, error));
			
			this.on("close", () => console.error(`${this.icon}❗️ WS Server closed`));
		}
		
	}
	
	on(event: "connection", callback: (this: this, socket: WSSC, request: http.IncomingMessage) => void): this;
	on(event: "error", callback: (this: this, error: Error) => void): this;
	on(event: "headers", callback: (this: this, headers: string[], request: http.IncomingMessage) => void): this;
	on(event: "close" | "listening", callback: (this: this) => void): this;
	
	on(event: "client-connect", listener: (this: this, wscc: WSSC, request: http.IncomingMessage) => void): this;
	on(event: "client-error", listener: (this: this, wscc: WSSC, error: Error | undefined) => void): this;
	on(event: `client-${string}`, listener: (this: this, wscc: WSSC, ...args: any[]) => void): this;
	on(event: "client-close", listener: (this: this, wscc: WSSC) => void): this;
	
	on(event: string | symbol, listener: (this: this, ...args: any[]) => void): this;
	on(event: string | symbol, listener: (this: this, ...args: any[]) => void): this {
		return super.on(event, listener as (this: WebSocketServer, ...args: any[]) => void);
	}
	
	readonly isWebSocketServer = true;
	readonly isWebSocketServerClient = false;
	readonly isWebSocket = false;
	
	icon;
	name;
	get protocol() {
		return `ws${this.isS ? "s" : ""}`;
	}
	
	server;
	
	get isS() {
		return "setSecureContext" in this.server;
	}
	
	[isQuietSymbol]: boolean;
	
	[requestListenersSymbol] = new Map<string, RequestListener<WSSC>>();
	
	addRequestListener(kind: string, listener: RequestListener<WSSC>) {
		this[requestListenersSymbol].set(kind, listener);
		
		return this;
	}
	
	/**
	 * Alias for `addRequestListener()`
	 */
	onRequest = this.addRequestListener;
	
	removeRequestListener(kind: string) {
		this[requestListenersSymbol].delete(kind);
		
		return this;
	}
	
	/**
	 * Alias for `removeRequestListener()`
	 */
	offRequest = this.removeRequestListener;
	
	#handleConnection(wssc: WSSC, request: http.IncomingMessage) {
		
		/* Compatibility with Bun */
		if (!(wssc instanceof WSServerClient))
			WSServerClient.extend.call(wssc);
		
		Object.assign(wssc, {
			wss: this,
			userAgent: request.headers["user-agent"] ?? "",
			remoteAddress: getRemoteAddress(request)
		});
		
		WSServerClient.handleConnect.call(wssc);
		
		this.emit("client-connect", wssc, request);
		
		if (process.env.NODE_ENV === "development" && !this[isQuietSymbol])
			console.info(
				`${this.icon} WS Server:`,
				"user" in wssc ? `\x1B[1m${(wssc.user as { email: string }).email}\x1B[0m` : "\x1B[3manonymous\x1B[0m",
				"connected"
			);
		
	}
	
	
	static makeProps<SWSSC extends WSServerClient>({ ssl }: Options<SWSSC>): http.ServerOptions | https.ServerOptions {
		return {
			...resolveSSL(ssl)
		};
	}
	
}
