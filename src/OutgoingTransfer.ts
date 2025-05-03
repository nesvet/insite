import { uid } from "@nesvet/n";
import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { chunkSize as defaultChunkSize, headers } from "./common";
import { StringStreamer } from "./StringStreamer";
import type { FileStreamer } from "./browser/FileStreamer";
import type {
	OutgoingChunk,
	OutgoingTransferHandles,
	OutgoingTransferMethods,
	OutgoingTransferProps,
	OutgoingTransferTypes,
	TransferTypes
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


// FIXME


export class OutgoingTransfer<WSORWSSC extends WS | WSServerClient> {
	constructor(
		ws: WSORWSSC,
		kind: string,
		{
			data,
			type,
			incomingType,
			collect,
			metadata,
			size,
			chunkSize,
			encoding,
			incomingEncoding,
			onBegin,
			onSenderProgress,
			onProgress,
			onEnd,
			onError
		}: OutgoingTransferProps<WSORWSSC, any, any>,
		handles: OutgoingTransferHandles
	) {
		
		this.ws = ws;
		this.#callArgs = ws.isWebSocket ? [ ws ] as const : [ ws.wss, ws ] as const;
		this.kind = kind;
		this.data = data;
		this.type = type;
		this.collect = collect ?? false;
		this.metadata = metadata;
		this.size = size ?? null;
		this.encoding = encoding;
		this.chunkSize = chunkSize ?? (this.constructor as typeof OutgoingTransfer).chunkSize;
		
		this.#handles = handles;
		
		if (onBegin)
			this.#onBegin = onBegin;
		if (onSenderProgress)
			this.#onSenderProgress = onSenderProgress;
		if (onProgress)
			this.#onProgress = onProgress;
		if (onEnd)
			this.#onEnd = onEnd;
		if (onError)
			this.#onError = onError;
		
		this.#setupPromise = this.#setup(incomingType, incomingEncoding);
		
	}
	
	ws;
	#callArgs;
	kind;
	data?;
	type?: string;
	collect;
	metadata;
	size;
	encoding;
	chunkSize;
	
	#handles;
	
	#onBegin?;
	#onSenderProgress?;
	#onProgress?;
	#onEnd?;
	#onError?;
	
	#setupPromise;
	
	id = uid();
	#methods?: OutgoingTransferMethods<OutgoingTransfer<WSORWSSC>>;
	isAborted = false;
	isTransfered = false;
	confirmResponse?: string;
	beginAt: number | null = null;
	#prevChunkAt: number | null = null;
	#chunksQueue: OutgoingChunk[] = [];
	#isProcessing = false;
	duration: number | null = null;
	transferedSize = 0;
	bytesPerMs: number | null = null;
	senderProgress = 0;
	progress: number = 0;
	endAt: number | null = null;
	error: Error | null = null;
	stringStreamer?: StringStreamer;
	fileStreamer?: FileStreamer;
	
	[key: number | string | symbol]: unknown;
	
	async #setup(incomingType?: string, incomingEncoding?: string) {
		
		for (const [ availableType, test, methods ] of (this.constructor as typeof OutgoingTransfer).types)
			if (this.type === availableType || test(this.data as string)) {
				this.type = availableType;
				this.#methods = methods;
				break;
			}
		
		if (this.type) {
			await this.#methods!.setup.call(this);
			delete this.data;
		} else
			throw new Error("Unknown type of transfer");
		
		this.ws.sendMessage(headers.request, this.kind, this.id, {
			type: incomingType ?? this.type,
			collect: this.collect,
			encoding: incomingEncoding ?? this.encoding,
			size: this.size,
			metadata: this.metadata
		});
		
	}
	
	whenSetUp() {
		return this.#setupPromise;
	}
	
	async handleConfirm(confirmResponse: string) {
		this.confirmResponse = confirmResponse;
		
		this.beginAt =
			this.#prevChunkAt =
				Date.now();
		
		await (this.#onBegin as any)?.call(...this.#callArgs, this);
		
		await this.#methods!.confirm.call(this);
		
	}
	
	handleChunk = (chunk: OutgoingChunk) => {
		this.#chunksQueue.push(chunk);
		
		if (!this.#isProcessing) {
			this.#isProcessing = true;
			void this.#process();
		}
		
	};
	
	async #process() {
		
		let chunk = this.#chunksQueue.shift()!;
		
		const chunkLength = chunk.length!;
		
		if (this.#methods!.transformChunk)
			chunk = await this.#methods!.transformChunk.call(this, chunk);
		
		this.ws.sendMessage(headers.chunk, this.id, chunk, chunkLength);
		
		const ts = Date.now();
		this.bytesPerMs = chunkLength / (ts - this.#prevChunkAt!);
		this.#prevChunkAt = ts;
		this.transferedSize += chunkLength;
		
		if (this.size)
			this.senderProgress = this.transferedSize / this.size;
		
		await (this.#onSenderProgress as any)?.call(...this.#callArgs, this);
		
		if (this.#chunksQueue.length)
			void this.#process();
		else {
			this.#isProcessing = false;
			
			if (this.senderProgress === 1)
				this.sent();
		}
		
	}
	
	sent = () => this.ws.sendMessage(headers.sent, this.id);
	
	handleProgress(progress: number) {
		this.progress = progress;
		
		(this.#onProgress as any)?.call(...this.#callArgs, this);
		
	}
	
	async handleCompleted() {
		
		this.isTransfered = true;
		
		if (!this.size) {
			this.size = this.transferedSize;
			this.senderProgress = 1;
		}
		
		this.endAt = Date.now();
		this.duration = this.endAt - this.beginAt!;
		this.bytesPerMs = this.size / this.duration;
		
		this.#handles.delete(this.id);
		
		if (this.progress !== 1) {
			this.progress = 1;
			await (this.#onProgress as any)?.call(...this.#callArgs, this);
		}
		
		(this.#onEnd as any)?.call(...this.#callArgs, this);
		
	}
	
	throw(errorMessage: string) {
		
		this.#handles.delete(this.id);
		
		this.error = new Error(errorMessage);
		
		(this.#onError as any)?.call(...this.#callArgs, this, this.error);
		
	}
	
	abort() {
		
		this.isAborted = true;
		
		this.ws.sendMessage(headers.abort, this.id);
		
		return this.throw("Transfer is aborted by sender");
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
			isTransfered: this.isTransfered,
			confirmResponse: this.confirmResponse,
			beginAt: this.beginAt,
			duration: this.duration,
			transferedSize: this.transferedSize,
			bytesPerMs: this.bytesPerMs,
			senderProgress: this.senderProgress,
			progress: this.progress,
			endAt: this.endAt,
			error: this.error
		};
	}
	
	
	static types: OutgoingTransferTypes<OutgoingTransfer<WS | WSServerClient>, TransferTypes> = [
		
		[ "object", data => typeof data == "object", {
			
			setup() {
				
				this.stringStreamer = new StringStreamer(JSON.stringify(this.data), { chunkSize: this.chunkSize });
				this.collect = true;
				this.size = this.stringStreamer.size;
				this.encoding = "utf8";
				
			},
			
			confirm() {
				
				this.stringStreamer!.start(this.handleChunk);
				
			}
		} ],
		
		[ "datauri", data => typeof data == "string" && /^data:[\w-.]+\/[\w-.+,]+(?:;base64)?,/.test(data), {
			
			setup() {
				
				const [ type, data ] = (this.data as string).split(/^data:|;base64,|,/).slice(1);
				
				this.stringStreamer = new StringStreamer(data, { chunkSize: this.chunkSize });
				this.size = this.stringStreamer.size;
				this.encoding = "base64";
				this.metadata = { ...this.metadata, type };
				
			},
			
			confirm() {
				
				this.stringStreamer!.start(this.handleChunk);
				
			}
		} ],
		
		[ "string", data => typeof data == "string", {
			
			setup() {
				
				this.stringStreamer = new StringStreamer(this.data as string, { chunkSize: this.chunkSize });
				this.size = this.stringStreamer.size;
				if (!this.encoding)
					this.encoding = "utf8";
				
			},
			
			confirm() {
				
				this.stringStreamer!.start(this.handleChunk);
				
			}
		} ]
		
	];
	
	static chunkSize = defaultChunkSize;
	
}
