import type { WS } from "insite-ws/client";
import type { WSServer, WSServerClient } from "insite-ws/server";
import { headers, sizeLimit as defaultSizeLimit } from "./common";
import { IncomingTransfer } from "./IncomingTransfer";
import type {
	IncomingChunk,
	IncomingTransferHandles,
	IncomingTransferListener,
	IncomingTransferListenerOptions,
	IncomingTransferProps,
	IncomingTransportOptions,
	ParametersWithoutFirst,
	TransferTypes
} from "./types";


export class IncomingTransport<
	WSORWSSC extends WS | WSServerClient,
	T extends IncomingTransfer<WSORWSSC>,
	Types extends TransferTypes = TransferTypes
> {
	constructor(ws: WS | WSServer<Exclude<WSORWSSC, WS>>, options: IncomingTransportOptions = {}) {
		
		const {
			sizeLimit = defaultSizeLimit
		} = options;
		
		this.sizeLimit = sizeLimit;
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.request}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(wssc, ...args));
			ws.on(`client-message:${headers.chunk}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(wssc, ...args));
			ws.on(`client-message:${headers.sent}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(wssc, ...args));
			ws.on(`client-message:${headers.abort}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(wssc, ...args));
		} else {
			ws.on(`message:${headers.request}`, (...args: ParametersWithoutFirst<typeof this.handleRequest>) => this.handleRequest(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.chunk}`, (...args: ParametersWithoutFirst<typeof this.handleChunk>) => this.handleChunk(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.sent}`, (...args: ParametersWithoutFirst<typeof this.handleSent>) => this.handleSent(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.abort}`, (...args: ParametersWithoutFirst<typeof this.handleAbort>) => this.handleAbort(ws as WSORWSSC, ...args));
		}
		
		Object.assign(ws, {
			onTransfer: (kind: string, listener: IncomingTransferListener<WSORWSSC, T>, listenerOptions?: IncomingTransferListenerOptions) => this.on(kind, listener, listenerOptions),
			onceTransfer: (kind: string, listener: IncomingTransferListener<WSORWSSC, T>, listenerOptions?: Omit<IncomingTransferListenerOptions, "once">) => this.once(kind, listener, listenerOptions)
		});
		
	}
	
	sizeLimit;
	
	#listeners = new Map<string, Set<IncomingTransferListener<WSORWSSC, T>>>();
	
	addTransferListener(kind: string, listener: IncomingTransferListener<WSORWSSC, T>, options?: IncomingTransferListenerOptions) {
		if (options?.once)
			listener.once = true;
		
		this.#listeners.get(kind)?.add(listener) ??
		this.#listeners.set(kind, new Set([ listener ]));
		
		return this;
	}
	
	on = this.addTransferListener;
	
	once(kind: string, listener: IncomingTransferListener<WSORWSSC, T>, options?: Omit<IncomingTransferListenerOptions, "once">) {
		return this.addTransferListener(kind, listener, { ...options, once: true });
	}
	
	removeTransferListener(kind: string, listener?: IncomingTransferListener<WSORWSSC, T>) {
		if (listener) {
			const listeners = this.#listeners.get(kind);
			
			if (listeners) {
				listeners.delete(listener);
				
				if (!listeners.size)
					this.#listeners.delete(kind);
			}
		} else
			this.#listeners.delete(kind);
		
		return this;
	}
	
	off = this.removeTransferListener;
	
	#transfers = new Map<string, T>();
	
	#transferHandles: IncomingTransferHandles = {
		
		delete: (id: string) => this.#transfers.delete(id),
		
		removeListener: (kind: string, listener: IncomingTransferListener<WSORWSSC, T>) => this.removeTransferListener(kind, listener)
		
	};
	
	private handleRequest(
		ws: WSORWSSC,
		kind: string,
		id: string,
		{ type, size, metadata, ...restProps }: IncomingTransferProps<Types>
	) {
		
		const { Transfer } = this.constructor as typeof IncomingTransport;// eslint-disable-line @typescript-eslint/naming-convention
		
		if (!this.#listeners.has(kind))
			ws.sendMessage(headers.error, id, `Unknown kind of file "${kind}"`);
		else if (this.#transfers.has(id))
			ws.sendMessage(headers.error, id, "Transfer already exists");
		else if (!(type in Transfer.types))
			ws.sendMessage(headers.error, id, "Unknown type of transfer");
		else if (size > this.sizeLimit)
			ws.sendMessage(headers.error, id, `Transfer size (${size} bytes) exeeds limit of ${this.sizeLimit} bytes`);
		else
			this.#transfers.set(id, new Transfer(
				ws,
				kind,
				id,
				{
					type: type as Exclude<TransferTypes, string>,
					size,
					metadata,
					...restProps
				},
				this.#transferHandles,
				this.#listeners.get(kind)!
			) as T);
		
	}
	
	private async handleChunk(ws: WSORWSSC, id: string, chunk: IncomingChunk, length = chunk.length) {
		await this.#transfers.get(id)?.handleChunk(chunk, length);
		
	}
	
	private async handleSent(ws: WSORWSSC, id: string) {
		await this.#transfers.get(id)?.handleSent();
		
	}
	
	private handleAbort(ws: WSORWSSC, id: string) {
		this.#transfers.get(id)?.abort(true);
		
	}
	
	
	static Transfer = IncomingTransfer;
	
}
