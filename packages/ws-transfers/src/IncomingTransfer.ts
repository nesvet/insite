import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { headers, progressInterval } from "./common";
import type {
	IncomingChunk,
	IncomingData,
	IncomingTransferHandles,
	IncomingTransferListener,
	IncomingTransferMethods,
	IncomingTransferProps,
	IncomingTransferTypes,
	TransferTypes
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class IncomingTransfer<WSORWSSC extends WS | WSServerClient> {
	constructor(
		ws: WSORWSSC,
		kind: string,
		id: string,
		{
			type,
			collect,
			encoding,
			size,
			metadata
		}: IncomingTransferProps<TransferTypes>,
		handles: IncomingTransferHandles,
		listeners: Set<IncomingTransferListener<WSORWSSC, any>>
	) {
		
		this.ws = ws;
		this.#callArgs = ws.isWebSocket ? [ ws ] as const : [ ws.wss, ws ] as const;
		this.kind = kind;
		this.id = id;
		this.type = type;
		this.collect = !!collect;
		this.encoding = encoding;
		this.size = size;
		this.metadata = metadata;
		
		this.#handles = handles;
		this.#listeners = listeners;
		
		this.#setupPromise = this.#setup();
		
	}
	
	ws;
	#callArgs;
	kind;
	id;
	type;
	collect;
	encoding;
	size;
	metadata;
	
	#handles;
	#listeners;
	
	#setupPromise;
	
	data?: IncomingData;
	#methods?: IncomingTransferMethods<IncomingTransfer<WSORWSSC>>;
	isAborted = false;
	isAbortedBySender = false;
	isAbortedByReceiver = false;
	isTransfered = false;
	confirmResponse?: string;
	beginAt: number | null = null;
	#prevChunkAt: number | null = null;
	#chunksQueue: [ chunk: IncomingChunk, length: number ][] = [];
	#isProcessing = false;
	duration: number | null = null;
	transferedSize = 0;
	processedSize = 0;
	bytesPerMs: number | null = null;
	progress = 0;
	endAt: number | null = null;
	error: Error | null = null;
	
	[key: number | string | symbol]: unknown;
	
	#progressInterval?: ReturnType<typeof setTimeout>;
	#lastProgress = 0;
	
	async #setup() {
		
		this.#methods = (this.constructor as typeof IncomingTransfer<WSORWSSC>).types[this.type];
		
		if (this.#methods)
			await this.#methods.setup.call(this);
		else
			throw new Error(`Unknown type of transfer "${String(this.type)}"`);
		
		await this.confirm();
		
	}
	
	whenSetUp() {
		return this.#setupPromise;
	}
	
	async confirm() {
		
		for (const { begin } of this.#listeners)
			if (await (begin as any)?.call(...this.#callArgs, this) === false)
				return this.throw("Transfer was rejected by receiver");
		
		this.beginAt =
			this.#prevChunkAt =
				Date.now();
		
		this.ws.sendMessage(headers.confirm, this.id, this.confirmResponse);
		
		this.#progressInterval = setInterval(() => {
			
			if (this.#lastProgress !== this.progress) {
				this.#lastProgress = this.progress;
				this.ws.sendMessage(headers.progress, this.id, this.progress);
			}
			
		}, progressInterval);
		
	}
	
	async handleChunk(chunk: IncomingChunk, length = chunk.length) {
		
		const ts = Date.now();
		this.bytesPerMs = length / (ts - this.#prevChunkAt!);
		this.#prevChunkAt = ts;
		this.transferedSize += length;
		
		this.#chunksQueue.push([ chunk, length ]);
		
		if (!this.#isProcessing) {
			this.#isProcessing = true;
			await this.#process();
		}
		
	}
	
	async #process() {
		
		let [ chunk, length ] = this.#chunksQueue.shift()!;
		
		if (this.#methods!.transformChunk)
			chunk = await this.#methods!.transformChunk.call(this, chunk);
		
		if (this.collect)
			await this.#methods!.collect.call(this, chunk);
		
		for (const { chunk: chunkListener, progress: progressListener } of this.#listeners)
			await ((chunkListener ?? progressListener) as any)?.call(...this.#callArgs, this, chunk);
		
		this.processedSize += length;
		if (this.size)
			this.progress = this.processedSize / this.size;
		
		if (this.#chunksQueue.length)
			void this.#process();
		else {
			this.#isProcessing = false;
			
			if (this.isTransfered)
				void this.#complete();
		}
		
	}
	
	async handleSent() {
		
		this.isTransfered = true;
		
		if (!this.size)
			this.size = this.transferedSize;
		
		this.endAt = Date.now();
		this.duration = this.endAt - this.beginAt!;
		this.bytesPerMs = this.size / this.duration;
		
		if (!this.#isProcessing)
			await this.#complete();
		
	}
	
	async #complete() {
		
		this.progress = 1;
		
		await this.#methods!.done?.call(this);
		
		for (const listener of this.#listeners) {
			if (listener.once)
				this.#handles.removeListener(this.kind, listener);
			
			await (listener.end as any)?.call(...this.#callArgs, this);
		}
		
		clearInterval(this.#progressInterval);
		
		this.#handles.delete(this.id);
		
		this.ws.sendMessage(headers.completed, this.id);
		
	}
	
	abort(bySender = false) {
		
		this.isAborted = true;
		this.isAbortedBySender = bySender;
		this.isAbortedByReceiver = !bySender;
		
		return this.throw(`Transfer is aborted by ${bySender ? "sender" : "receiver"}`, !bySender);
	}
	
	throw(errorMessage: string, sendToSender = true) {
		
		this.#handles.delete(this.id);
		
		clearInterval(this.#progressInterval);
		
		this.error = new Error(errorMessage);
		
		for (const listener of this.#listeners) {
			if (listener.once)
				this.#handles.removeListener(this.kind, listener);
			
			(listener.error as any)?.call(...this.#callArgs, this, this.error);
		}
		
		if (sendToSender)
			this.ws.sendMessage(headers.error, this.id, errorMessage);
		
	}
	
	serialize() {
		return {
			id: this.id,
			kind: this.kind,
			type: this.type,
			collect: this.collect,
			encoding: this.encoding,
			size: this.size,
			metadata: this.metadata,
			isAborted: this.isAborted,
			isAbortedBySender: this.isAbortedBySender,
			isAbortedByReceiver: this.isAbortedByReceiver,
			isTransfered: this.isTransfered,
			confirmResponse: this.confirmResponse,
			beginAt: this.beginAt,
			duration: this.duration,
			transferedSize: this.transferedSize,
			processedSize: this.processedSize,
			bytesPerMs: this.bytesPerMs,
			progress: this.progress,
			endAt: this.endAt,
			error: this.error
		};
	}
	
	
	static types: IncomingTransferTypes<IncomingTransfer<WS | WSServerClient>, TransferTypes> = {
		
		object: {
			setup() {
				
				this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;// eslint-disable-line @typescript-eslint/restrict-plus-operands
				
			},
			
			done() {
				this.data = JSON.parse(this.data as string);
				
			}
		},
		
		datauri: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;// eslint-disable-line @typescript-eslint/restrict-plus-operands
				
			},
			
			done() {
				
				if (this.collect)
					this.data = `data:${this.metadata.type as string};base64,${this.data as string}`;
				
			}
		},
		
		string: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;// eslint-disable-line @typescript-eslint/restrict-plus-operands
				
			}
		}
		
	};
	
}
