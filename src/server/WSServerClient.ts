import { ClientRequest, IncomingMessage } from "node:http";
import { RawData, WebSocket } from "ws";
import { handleMongoError } from "@nesvet/n";
import {
	HEARTBEAT_GAP,
	HEARTBEAT_INTERVAL,
	REQUEST_COUNTER_LIMIT,
	REQUEST_HEADERS
} from "../common";
import {
	defibSymbol,
	heartbeatIntervalSymbol,
	heartbeatTimeoutSymbol,
	heartbeatTsSymbol,
	isQuietSymbol,
	requestCounterSymbol,
	requestListenersSymbol
} from "./symbols";
import { WSServer } from "./WSServer";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class WSServerClient extends WebSocket {
	on(event: "close", listener: (this: this, code: number, reason: Buffer) => void): this;
	on(event: "error", listener: (this: this, error: Error) => void): this;
	on(event: "upgrade", listener: (this: this, request: IncomingMessage) => void): this;
	on(event: "message", listener: (this: this, data: RawData, isBinary: boolean) => void): this;
	on(event: "open", listener: (this: this) => void): this;
	on(event: "unexpected-response", listener: (this: this, request: ClientRequest, response: IncomingMessage) => void): this;
	on(event: string | symbol, listener: (this: this, ...args: any[]) => void): this;
	on(event: string | symbol, listener: (this: this, ...args: any[]) => void): this {
		return super.on(event, listener as (this: WebSocket, ...args: any[]) => void);
	}
	
	get isConnecting() {
		return this.readyState === this.CONNECTING;
	}
	
	get isOpen() {
		return this.readyState === this.OPEN;
	}
	
	get isClosing() {
		return this.readyState === this.CLOSING;
	}
	
	get isClosed() {
		return this.readyState === this.CLOSED;
	}
	
	readonly isWebSocketServerClient = true;
	readonly isWebSocketServer = false;
	readonly isWebSocket = false;
	
	wss!: WSServer<this>;
	
	userAgent = "";
	
	remoteAddress = "";
	
	[heartbeatTimeoutSymbol]?: ReturnType<typeof setTimeout>;
	
	[defibSymbol]() {
		
		clearTimeout(this[heartbeatTimeoutSymbol]);
		
		this[heartbeatTimeoutSymbol] = setTimeout(
			() => this.terminate(),
			HEARTBEAT_INTERVAL + HEARTBEAT_GAP
		);
		
	}
	
	latency = 0;
	
	[heartbeatTsSymbol]?: number;
	
	[heartbeatIntervalSymbol] = WSServerClient.makeHeartbeatInterval.call(this);
	
	sendMessage(...args: unknown[]) {
		return this.send(JSON.stringify(args));
	}
	
	[requestCounterSymbol]: number = 0;
	
	sendRequest(...args: unknown[]) {
		
		const id = this[requestCounterSymbol]++;
		
		if (this[requestCounterSymbol] >= REQUEST_COUNTER_LIMIT)
			this[requestCounterSymbol] = 0;
		
		const eventName = `message:${REQUEST_HEADERS.RESPONSE}-${id}`;
		
		if (typeof args.at(-1) == "function") {
			this.once(eventName, args.splice(-1, 1)[0] as () => void);
			
			this.sendMessage(REQUEST_HEADERS.REQUEST, id, ...args);
			
			return this;
		}
		
		return new Promise((resolve, reject) => {
			
			this.once(eventName, (error, result) => {
				if (error) {
					const { message, ...restProps } = error;
					reject(Object.assign(new Error(message), restProps) as Error);
				} else
					resolve(result);
				
			});
			
			this.sendMessage(REQUEST_HEADERS.REQUEST, id, ...args);
			
		});
	}
	
	
	static makeHeartbeatInterval(this: WSServerClient) {
		return setInterval(() => {
			
			this[heartbeatTsSymbol] = Date.now();
			
			this.send("");
			
		}, HEARTBEAT_INTERVAL);
	}
	
	/* Compatibility with Bun */
	static extend(this: WSServerClient) {
		
		Object.defineProperties(this, {
			isConnecting: {
				get: Object.getOwnPropertyDescriptor(WSServerClient.prototype, "isConnecting")!.get
			},
			isOpen: {
				get: Object.getOwnPropertyDescriptor(WSServerClient.prototype, "isOpen")!.get
			},
			isClosing: {
				get: Object.getOwnPropertyDescriptor(WSServerClient.prototype, "isClosing")!.get
			},
			isClosed: {
				get: Object.getOwnPropertyDescriptor(WSServerClient.prototype, "isClosed")!.get
			}
		});
		
		const { terminate } = this;
		
		Object.assign(this, {
			isWebSocketServerClient: true,
			isWebSocketServer: false,
			isWebSocket: false,
			[defibSymbol]: WSServerClient.prototype[defibSymbol],
			latency: 0,
			[heartbeatIntervalSymbol]: WSServerClient.makeHeartbeatInterval.call(this),
			sendMessage: WSServerClient.prototype.sendMessage,
			sendRequest: WSServerClient.prototype.sendRequest,
			terminate() { /* Workaround Bun's WebSocket#terminate bug */
				
				try {
					terminate.call(this);
				} catch (error) {
					console.error(error);
				}
				
			}
		});
		
	}
	
	static handleConnect(this: WSServerClient) {
		
		this.on("message", WSServerClient.handleMessage);
		this.on("error", WSServerClient.handleError);
		this.on("close", WSServerClient.handleClose);
		
		this[defibSymbol]();
		
	}
	
	static handleMessage(this: WSServerClient, data: RawData) {
		const message = data.toString();// eslint-disable-line @typescript-eslint/no-base-to-string
		
		this[defibSymbol]();
		
		if (message)
			if (message === "?")
				this.send("!");
			else
				try {
					const [ kind, ...rest ] = JSON.parse(message);
					
					switch (kind) {
						case REQUEST_HEADERS.REQUEST:
							void WSServerClient.handleRequest.call(this, ...rest as [ id: number, kind: string, ...rest: unknown[] ]);
							break;
						
						default:
							this.emit(`message:${kind}`, ...rest);
							this.wss.emit("client-message", this, kind, ...rest);
							this.wss.emit(`client-message:${kind}`, this, ...rest);
					}
				} catch (error) {
					WSServerClient.handleError.call(this, error as Error);
				}
		else if (this[heartbeatTsSymbol]) {
			this.latency = Date.now() - this[heartbeatTsSymbol];
			this[heartbeatTsSymbol] = undefined;
		}
		
	}
	
	static async handleRequest(this: WSServerClient, id: number, kind: string, ...rest: unknown[]) {
		const listener = this.wss[requestListenersSymbol].get(kind);
		
		let result;
		let requestError = null;
		
		if (listener)
			try {
				result = await listener.call(this.wss, this, ...rest);
			} catch (error) {
				if (process.env.NODE_ENV === "development")
					handleMongoError(error);
				
				if (error instanceof Error) {
					const { message, ...restProps } = error;
					requestError = { message, ...restProps };
				}
				
				if (process.env.NODE_ENV === "development" && !this.wss[isQuietSymbol])
					console.error(`${this.wss.icon}❗️ WS Server request "${kind}" (${id}):`, error);
			}
		else
			requestError = { message: `Unknown request kind "${kind}"` };
		
		this.sendMessage(`${REQUEST_HEADERS.RESPONSE}-${id}`, requestError, result);
		
	}
	
	static handleError(this: WSServerClient, error: Error | Event | undefined) {
		if (error instanceof Event)
			error = undefined;
		
		if (!this.wss[isQuietSymbol])
			console.error(
				`${this.wss.icon}❗️ WS Server client`,
				"user" in this ? `\x1B[1m${(this.user as { email: string }).email}\x1B[0m:` : "\x1B[3manonymous\x1B[0m:",
				error
			);
		
		this.wss.emit("client-error", this, error);
		
	}
	
	static handleClose(this: WSServerClient, code: number, reason: Buffer) {
		
		if (process.env.NODE_ENV === "development") {
			const reasonString = reason.toString();
			
			if (!this.wss[isQuietSymbol])
				console.info(
					`${this.wss.icon} WS Server:`,
					"user" in this ? `\x1B[1m${(this.user as { email: string }).email}\x1B[0m` : "\x1B[3manonymous\x1B[0m",
					`disconnected ${code ? `with code ${code}` : ""} ${code && reasonString ? "and " : ""}${reasonString ? `reason "${reasonString}"` : ""}`
				);
		}
		
		clearTimeout(this[heartbeatTimeoutSymbol]);
		clearInterval(this[heartbeatIntervalSymbol]);
		
		this.wss.emit("client-close", this);
		
	}
	
}
