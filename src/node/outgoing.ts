import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Readable } from "node:stream";
import mime from "mime";
import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";
import type { OutgoingTransferTypes } from "../types";
import type { NodeTransferTypes } from "./types";


class NodeOutgoingTransfer<
	WSORWSSC extends WS | WSServerClient
> extends OutgoingTransfer<WSORWSSC> {
	
	stream?: Readable = this.stream;
	isBuffer?: boolean = this.isBuffer || false;
	
	
	static types: OutgoingTransferTypes<NodeOutgoingTransfer<WS | WSServerClient>, NodeTransferTypes> = [
		
		[ "stream", data => data instanceof Readable, {
			
			setup() {
				
				this.stream = this.data as Readable;
				
				if (!this.encoding)
					this.encoding = "buffer";
				
				if (this.encoding === "buffer")
					this.isBuffer = true;
				
			},
			
			confirm() {
				
				this.stream!.on("data", this.handleChunk);
				if (!this.size)
					this.stream!.on("end", this.sent);
				
			},
			
			transformChunk(chunk) {
				return (this.isBuffer ? chunk : Buffer.from(chunk as string, this.encoding as Exclude<typeof this.encoding, "buffer">)).toString("base64");// eslint-disable-line @typescript-eslint/no-base-to-string
			}
		} ],
		
		[ "file", data => typeof data == "string" && /^(\/|(\/[^/]+)+)$/.test(data), {
			
			async setup() {
				
				const fileName = this.data as string;
				const name = basename(fileName);
				const { size, mtimeMs: modifiedAt } = await stat(fileName);
				
				const metadata = {
					name,
					type: mime.getType(extname(name).slice(1)),
					size,
					modifiedAt
				};
				
				this.stream = createReadStream(fileName);
				
				this.size = size;
				this.encoding = "buffer";
				
				if (this.metadata)
					Object.assign(this.metadata, metadata);
				else
					this.metadata = metadata;
				
			},
			
			confirm() {
				
				this.stream!.on("data", this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return chunk.toString("base64");// eslint-disable-line @typescript-eslint/no-base-to-string
			}
		} ],
		
		...OutgoingTransfer.types
		
	];
	
}

class NodeOutgoingTransport<
	WSORWSSC extends WS | WSServerClient
> extends OutgoingTransport<WSORWSSC, NodeOutgoingTransfer<WSORWSSC>, NodeTransferTypes> {
	
	static Transfer = NodeOutgoingTransfer;
	
}


export {
	NodeOutgoingTransfer as OutgoingTransfer,
	NodeOutgoingTransport as OutgoingTransport
};
