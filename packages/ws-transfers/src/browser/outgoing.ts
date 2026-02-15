import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { OutgoingTransfer } from "../OutgoingTransfer";
import { OutgoingTransport } from "../OutgoingTransport";
import type { OutgoingTransferTypes } from "../types";
import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { FileStreamer } from "./FileStreamer";
import type { BrowserTransferTypes } from "./types";


class BrowserOutgoingTransfer<
	WSORWSSC extends WS | WSServerClient = WS
> extends OutgoingTransfer<WSORWSSC> {
	
	static types: OutgoingTransferTypes<BrowserOutgoingTransfer<WS>, BrowserTransferTypes> = [
		
		[ "file", data => typeof data == "object" && data instanceof File, {
			
			setup() {
				
				const file = this.data as File;
				
				this.fileStreamer = new FileStreamer(file, { chunkSize: this.chunkSize });
				
				const metadata = {
					name: file.name,
					type: file.type,
					size: file.size,
					modifiedAt: file.lastModified
				};
				
				if (this.metadata)
					Object.assign(this.metadata, metadata);
				else
					this.metadata = metadata;
				
				this.size = this.fileStreamer.size;
				this.encoding = "buffer";
				
			},
			
			confirm() {
				
				this.fileStreamer!.start(this.handleChunk);
				
			},
			
			transformChunk(chunk) {
				return arrayBufferToBase64(chunk as ArrayBuffer);
			}
		} ],
		
		...OutgoingTransfer.types as OutgoingTransferTypes<OutgoingTransfer<WS>, BrowserTransferTypes>
		
	];
	
}

class BrowserOutgoingTransport<
	WSORWSSC extends WS = WS
> extends OutgoingTransport<WSORWSSC, BrowserOutgoingTransfer<WSORWSSC>, BrowserTransferTypes> {
	
	static Transfer = BrowserOutgoingTransfer;
	
}


export {
	BrowserOutgoingTransfer as OutgoingTransfer,
	BrowserOutgoingTransport as OutgoingTransport
};
