import EventEmitter from "eventemitter3";
import { noop, StatefulPromise } from "@nesvet/n";
import {
	CODES,
	HEARTBEAT_GAP,
	HEARTBEAT_INTERVAL,
	NON_RECONNECTABLE_CODES,
	OFFLINE_TIMEOUT,
	REQUEST_COUNTER_LIMIT,
	REQUEST_HEADERS,
	RESPONSIVENESS_TIMEOUT
} from "../common";
import type { ConnectionQuality, Options, RequestListener } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


let i = 0;


export class WS extends EventEmitter {
	constructor(options: Options = {}) {
		super();
		
		const {
			url = globalThis.__insite?.wss_url || "/",
			name = (i++).toString(),
			protocols,
			immediately = true,
			reconnectAfter = 2000,
			on,
			once,
			quiet = false,
			signal
		} = options;
		
		this.url = url;
		this.name = name;
		
		this.protocols = protocols;
		
		this.reconnectAfter = reconnectAfter;
		
		if (on)
			for (const eventName in on)
				if (on[eventName])
					this.on(eventName, on[eventName]);
		
		if (once)
			for (const eventName in once)
				if (once[eventName])
					this.once(eventName, once[eventName]);
		
		this.#isQuiet = quiet;
		
		this.#abortSignal = signal;
		this.#abortSignal?.addEventListener("abort", this.#handleAbortSignalAbort, { once: true });
		
		if (this.url && immediately)
			this.open().catch(noop);
		
		if (!this.#isQuiet)
			this.on("error", (error: Error) => error && console.error("🔌❗️ WS", `${this.name}:`, error));
		
	}
	
	on(event: "connecting" | "destroy" | "open" | "responsive" | "unresponsive", callback: (this: this) => void): this;
	on<T extends unknown[]>(event: "message", callback: (this: this, kind: string, ...rest: T) => void): this;
	on<T extends unknown[]>(event: `message:${string}`, callback: (this: this, ...rest: T) => void): this;
	on(event: "connection-quality-change", callback: (this: this, connectionQuality: ConnectionQuality, prevConnectionQuality: ConnectionQuality) => void): this;
	on(event: "close", callback: (this: this, closeEvent: CloseEvent) => void): this;
	on(event: "server-change", callback: (this: this, url: string, prevURL: string) => void): this;
	on(event: "error", callback: (this: this, error: Error) => void): this;
	
	on<T extends string | symbol>(event: T, fn: (...args: any[]) => void): this;
	on(event: string | symbol, listener: (this: this, ...args: any[]) => void): this {
		return super.on(event, listener);
	}
	
	readonly isWebSocket = true;
	readonly isWebSocketServer = false;
	readonly isWebSocketServerClient = false;
	
	url;
	
	readonly name;
	
	protocols?;
	
	reconnectAfter;
	
	#isQuiet;
	
	#abortSignal?: AbortSignal;
	
	isUsed = false;
	
	connectionQuality: ConnectionQuality = 0;
	
	#updateConnectionQuality(connectionQuality: ConnectionQuality) {
		if (connectionQuality !== this.connectionQuality) {
			const prevConnectionQuality = this.connectionQuality;
			this.connectionQuality = connectionQuality;
			
			this.emit("connection-quality-change", this.connectionQuality, prevConnectionQuality);
		}
		
	}
	
	webSocket: WebSocket | null = null;
	
	#heartbeatTimeout?: ReturnType<typeof setTimeout>;
	
	#defib() {
		
		clearTimeout(this.#heartbeatTimeout);
		this.#heartbeatTimeout = setTimeout(
			() => this.close(CODES.NO_HEARTBEAT, "no-heartbeat", false),
			HEARTBEAT_INTERVAL + HEARTBEAT_GAP
		);
		
		if (this.#unresponsiveTimeout) {
			clearTimeout(this.#unresponsiveTimeout);
			this.#unresponsiveTimeout = undefined;
		}
		
		this.#isCheckingResponsiveness = false;
		
		if (this.#offlineTimeout) {
			clearTimeout(this.#offlineTimeout);
			this.#offlineTimeout = undefined;
		}
		
		if (this.#isUnresponsive) {
			this.#isUnresponsive = false;
			
			this.emit("responsive");
		}
		
		this.#updateConnectionQuality(WS.CONNECTION_QUALITY.OPEN);
		
	}
	
	#unresponsiveTimeout?: ReturnType<typeof setTimeout>;
	#isCheckingResponsiveness = false;
	
	#offlineTimeout?: ReturnType<typeof setTimeout>;
	#isUnresponsive = false;
	
	get state() {
		
		if (!this.webSocket)
			return "closed";
		
		switch (this.webSocket.readyState) {
			case WebSocket.CONNECTING:
				return "connecting";
			
			case WebSocket.OPEN:
				return this.#isUnresponsive ? "unresponsive" : "open";
			
			case WebSocket.CLOSING:
				return "closing";
		}
		
		return "closed";
	}
	
	get isConnecting() {
		return this.webSocket?.readyState === WebSocket.CONNECTING;
	}
	
	get isOpen() {
		return this.webSocket?.readyState === WebSocket.OPEN;
	}
	
	get isClosing() {
		return this.webSocket?.readyState === WebSocket.CLOSING;
	}
	
	get isClosed() {
		return !this.webSocket;
	}
	
	isDestroyed = false;
	
	#openPromise?: StatefulPromise<void>;
	
	#wasOpened = false;
	
	#handleWebSocketOpen = () => {
		
		this.#wasOpened = true;
		
		this.closedWith = null;
		
		this.#openPromise!.resolve();
		
		this.#defib();
		
		this.emit("open");
		
	};
	
	#handleWebSocketMessage = ({ data: message }: MessageEvent<string>) => {
		
		this.#defib();
		
		if (message) {
			if (message !== "!")
				try {
					const [ kind, ...rest ] = JSON.parse(message);
					
					switch (kind) {
						case REQUEST_HEADERS.REQUEST:
							void this.#handleRequest(...rest as [ id: number, kind: string, ...rest: unknown[] ]);
							break;
						
						default:
							this.emit("message", kind, ...rest);
							this.emit(`message:${kind}`, ...rest);
					}
				} catch (error) {
					this.#handleWebSocketError(error as Error);
				}
		} else
			this.webSocket!.send("");
		
	};
	
	#handleWebSocketError = (error: Error | Event | undefined) => {
		if (error instanceof Event)
			error = undefined;
		
		if (this.#openPromise?.isPending)
			this.#openPromise.reject(error as Error);
		
		this.emit("error", error);
		
	};
	
	#reconnectTimeout?: ReturnType<typeof setTimeout>;
	
	#decideReconnect(code: number) {
		
		if (this.#reconnectTimeout)
			clearTimeout(this.#reconnectTimeout);
		
		if (this.reconnectAfter && !NON_RECONNECTABLE_CODES.includes(code as typeof NON_RECONNECTABLE_CODES[number])) {
			if (process.env.NODE_ENV === "development" && !this.#isQuiet)
				console.info(`🔌 WS ${this.name} will try to reconnect in ${Math.round(this.reconnectAfter / 1000)} seconds`);
			
			this.#reconnectTimeout = setTimeout(() => this.open().catch(noop), this.reconnectAfter);
			
			this.#updateConnectionQuality(WS.CONNECTION_QUALITY.RECONNECTING);
		} else {
			this.#reconnectTimeout = undefined;
			
			this.#updateConnectionQuality(code === CODES.REOPEN ? WS.CONNECTION_QUALITY.RECONNECTING : WS.CONNECTION_QUALITY.CLOSED);
		}
		
	}
	
	#handleWebSocketClose = (event: CloseEvent) => {
		const { code, reason, wasClean } = event;
		
		this.closedWith = { code, reason, wasClean };
		
		if (this.#heartbeatTimeout) {
			clearTimeout(this.#heartbeatTimeout);
			this.#heartbeatTimeout = undefined;
		}
		
		if (this.#unresponsiveTimeout) {
			clearTimeout(this.#unresponsiveTimeout);
			this.#unresponsiveTimeout = undefined;
		}
		
		this.#isCheckingResponsiveness = false;
		
		if (this.#offlineTimeout) {
			clearTimeout(this.#offlineTimeout);
			this.#offlineTimeout = undefined;
		}
		
		this.#isUnresponsive = false;
		
		if (this.#openPromise?.isPending)
			this.#openPromise.reject(new Error("Closed"));
		
		if (process.env.NODE_ENV === "development" && !this.#isQuiet) {
			let message = `🔌 WS ${this.name} is closed`;
			
			if (code)
				message += ` with code ${code}`;
			
			if (code && reason)
				message += " and";
			
			if (reason)
				message += ` reason "${reason}"`;
			
			switch (reason) {
				case "no-heartbeat":
					message += ". Going offline";
			}
			
			if (!wasClean || code === CODES.ABNORMAL) {
				message += " [UNEXPECTED]";
				console.warn(message);
			} else
				console.info(message);
		}
		
		const webSocket = this.webSocket!;
		
		webSocket.removeEventListener("open", this.#handleWebSocketOpen);
		webSocket.removeEventListener("message", this.#handleWebSocketMessage);
		webSocket.removeEventListener("error", this.#handleWebSocketError);
		
		if (this.#wasOpened) {
			this.emit("close", event);
			
			this.#wasOpened = false;
		}
		
		this.webSocket = null;
		
		this.#decideReconnect(code);
		
		if ("navigator" in globalThis && "addEventListener" in globalThis)
			globalThis.removeEventListener("offline", this.#handleOffline);
		
	};
	
	#handleAbortSignalAbort = () =>
		this.#openPromise?.isPending &&
		this.#openPromise.reject(new DOMException("Operation aborted", "AbortError"));
	
	async open(options: Pick<Options, "protocols" | "url"> = {}): Promise<void> {
		
		if (this.isDestroyed)
			throw new Error("WS has been destroyed");
		
		if (this.#abortSignal?.aborted)
			throw new DOMException("Operation aborted", "AbortError");
		
		this.closedWith = null;
		
		if (this.#openPromise?.isPending)
			return this.#openPromise;
		
		if (this.isUsed)
			this.close(CODES.REOPEN, "reopen");
		else
			this.isUsed = true;
		
		let prevURL: URL | string | undefined;
		if (options.url && this.url !== options.url) {
			prevURL = this.url;
			this.url = options.url;
		}
		
		if (options.protocols)
			this.protocols = options.protocols;
		
		this.#openPromise = new StatefulPromise((_, reject) => {
			
			if (this.url) {
				const webSocket = new WebSocket(this.url, this.protocols);
				
				webSocket.addEventListener("open", this.#handleWebSocketOpen, { once: true });
				webSocket.addEventListener("message", this.#handleWebSocketMessage);
				webSocket.addEventListener("error", this.#handleWebSocketError);
				webSocket.addEventListener("close", this.#handleWebSocketClose, { once: true });
				
				this.webSocket = webSocket;
				
				if (prevURL)
					this.emit("server-change", this.url, prevURL);
				
				this.emit("connecting");
				
				if ("navigator" in globalThis && "addEventListener" in globalThis)
					globalThis.addEventListener("offline", this.#handleOffline);
			} else {
				this.webSocket = null;
				
				reject(new Error("url prop is not set"));
			}
			
		});
		
		return this.#openPromise;
	}
	
	/**
	 * Alias for `open()`
	 */
	connect = this.open;
	
	close(code: number = CODES.MANUAL, reason = "manual", wasClean: boolean = true) {
		
		if (this.isClosed)
			this.#decideReconnect(code);
		else {
			this.webSocket!.removeEventListener("close", this.#handleWebSocketClose);
			
			this.webSocket!.close(code, reason);
			
			this.#handleWebSocketClose(Object.assign(new Event("close"), {
				code,
				reason,
				wasClean
			}));
		}
		
	}
	
	closedWith: { code: number; reason: string; wasClean: boolean } | null = null;
	
	/**
	 * Alias for `close()`
	 */
	disconnect = this.close;
	
	#queue: (ArrayBufferLike | ArrayBufferView | Blob | string)[] = [];
	
	#releaseQueue = () => {
		
		for (const message of this.#queue)
			this.webSocket!.send(message);
		
		this.#queue.length = 0;
		
	};
	
	send(data: ArrayBufferLike | ArrayBufferView | Blob | string) {
		
		if (this.isOpen)
			this.webSocket!.send(data);
		else {
			if (!this.#queue.length)
				this.once("open", this.#releaseQueue);
			
			this.#queue.push(data);
		}
		
	}
	
	sendMessage(...args: unknown[]) {
		return this.send(JSON.stringify(args));
	}
	
	#requestCounter = 0;
	
	sendRequest<T>(...args: [...unknown[], callback: (error: Error | null, result: T) => void]): this;
	sendRequest<T>(...args: unknown[]): Promise<T>;
	sendRequest<T>(...args: unknown[]) {
		
		const id = this.#requestCounter++;
		
		if (this.#requestCounter >= REQUEST_COUNTER_LIMIT)
			this.#requestCounter = 0;
		
		const eventName = `message:${REQUEST_HEADERS.RESPONSE}-${id}`;
		
		const lastArg = args.at(-1);
		
		if (typeof lastArg == "function") {
			this.once(eventName, lastArg as (error: Error, result: T) => void);
			
			this.sendMessage(REQUEST_HEADERS.REQUEST, id, ...args.slice(0, -1));
			
			return this;
		}
		
		return new Promise<T>((resolve, reject) => {
			
			this.once(eventName, (error, result: T) => {
				if (error) {
					const { message, ...restProps } = error;
					reject(Object.assign(new Error(message), restProps) as Error);
				} else
					resolve(result);
				
			});
			
			this.sendMessage(REQUEST_HEADERS.REQUEST, id, ...args);
			
		});
	}
	
	#requestListeners = new Map<string, RequestListener>();
	
	addRequestListener(kind: string, listener: RequestListener) {
		this.#requestListeners.set(kind, listener);
		
		return this;
	}
	
	/**
	 * Alias for `addRequestListener()`
	 */
	onRequest = this.addRequestListener;
	
	removeRequestListener(kind: string) {
		this.#requestListeners.delete(kind);
		
		return this;
	}
	
	/**
	 * Alias for `removeRequestListener()`
	 */
	offRequest = this.removeRequestListener;
	
	#handleRequest = async (id: number, kind: string, ...rest: unknown[]) => {
		const listener = this.#requestListeners.get(kind);
		
		let result;
		let requestError = null;
		
		if (listener)
			try {
				result = await listener.apply(this, rest);
			} catch (error) {
				if (error instanceof Error) {
					const { message, ...restProps } = error;
					requestError = { message, ...restProps };
				}
			}
		else
			requestError = { message: `Unknown request kind "${kind}"` };
		
		this.sendMessage(`${REQUEST_HEADERS.RESPONSE}-${id}`, requestError, result);
		
	};
	
	#handleOffline = () => {
		
		if (this.isOpen && !this.#isCheckingResponsiveness) {
			this.#isCheckingResponsiveness = true;
			
			this.#updateConnectionQuality(WS.CONNECTION_QUALITY.CHECKING_RESPONSIVENESS);
			
			this.#unresponsiveTimeout = setTimeout(() => {
				
				this.#isCheckingResponsiveness = false;
				this.#isUnresponsive = true;
				
				this.#updateConnectionQuality(WS.CONNECTION_QUALITY.UNRESPONSIVE);
				
				this.emit("unresponsive");
				
				this.#offlineTimeout = setTimeout(() => {
					
					this.#isUnresponsive = false;
					
					this.close(CODES.OFFLINE, "offline", false);
					
				}, OFFLINE_TIMEOUT - RESPONSIVENESS_TIMEOUT);
				
			}, RESPONSIVENESS_TIMEOUT);
			
			this.webSocket!.send("?");
		}
		
	};
	
	destroy() {
		
		this.isDestroyed = true;
		
		this.#queue.length = 0;
		
		this.close(CODES.NORMAL, "destroy");
		
		this.emit("destroy");
		
		this.removeAllListeners();
		
		this.#abortSignal?.removeEventListener("abort", this.#handleAbortSignalAbort);
		
	}
	
	
	static CONNECTION_QUALITY = {
		CLOSED: 0,
		RECONNECTING: 1,
		UNRESPONSIVE: 2,
		CHECKING_RESPONSIVENESS: 3,
		OPEN: 4
	} as const;
	
}
