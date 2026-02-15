import { Readable, type Writable } from "node:stream";
import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";
import type { IncomingTransferMethods, IncomingTransferTypes } from "../types";
import type { NodeTransferTypes } from "./types";


export type { IncomingTransportOptions } from "../types";


class TransferStream extends Readable {
	constructor(writableStream: Writable) {
		super();
		
		this.writable = writableStream;
		
		this.promise = new Promise((resolve, reject) => {
			writableStream.on("close", resolve);
			writableStream.on("error", reject);
			
		});
		
		this.pipe(writableStream);
		
	}
	
	writable: Writable;
	
	promise: Promise<void>;
	
	_read() { /*  */ }
	
}

/** @this NodeIncomingTransfer */
function pipeTo(this: NodeIncomingTransfer<WS | WSServerClient>, writableStream: Writable) {
	const stream = new TransferStream(writableStream);
	
	this.streams?.push(stream) ??
	(this.streams = [ stream ]);
	
	return writableStream;
}

const streamMethod: IncomingTransferMethods<NodeIncomingTransfer<WS | WSServerClient>> = {
	setup() {
		
		if (!this.encoding)
			this.encoding = "buffer";
		
		if (this.encoding === "buffer")
			this.isBuffer = true;
		
		if (this.collect)
			this.data = this.isBuffer ? Buffer.from("") : "";
		
		this.pipeTo = pipeTo;
		
	},
	
	transformChunk(chunk) {
		chunk = this.isBuffer ?
			Buffer.from(chunk as string, "base64") :
			Buffer.from(chunk as string, "base64").toString(this.encoding as Exclude<typeof this.encoding, "buffer">);
		
		if (this.streams)
			for (const stream of this.streams)
				stream.push(chunk);
		
		return chunk;
	},
	
	collect(chunk) {
		if (this.isBuffer)
			this.data = Buffer.concat([ this.data as Buffer, chunk as Buffer ]);
		else
			this.data += chunk as string;// eslint-disable-line @typescript-eslint/restrict-plus-operands
		
	},
	
	async done() {
		
		if (this.streams) {
			const promises = [];
			
			for (const stream of this.streams) {
				stream.push(null);
				promises.push(stream.promise);
			}
			
			await Promise.all(promises);
		}
		
	}
};

export class NodeIncomingTransfer<
	WSORWSSC extends WS | WSServerClient
> extends IncomingTransfer<WSORWSSC> {
	
	streams?: TransferStream[];
	isBuffer?: boolean = this.isBuffer || false;
	pipeTo?: (this: NodeIncomingTransfer<WSORWSSC>, writableStream: Writable) => void = this.pipeTo;
	
	
	static types: IncomingTransferTypes<NodeIncomingTransfer<WS | WSServerClient>, NodeTransferTypes> = {
		
		stream: streamMethod,
		
		file: streamMethod,
		
		...IncomingTransfer.types
		
	};
}

class NodeIncomingTransport<
	WSORWSSC extends WS | WSServerClient
> extends IncomingTransport<WSORWSSC, NodeIncomingTransfer<WSORWSSC>, NodeTransferTypes> {
	
	static Transfer = NodeIncomingTransfer;
	
}


export {
	NodeIncomingTransfer as IncomingTransfer,
	NodeIncomingTransport as IncomingTransport
};
