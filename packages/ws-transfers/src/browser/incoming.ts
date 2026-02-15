import type { WS } from "insite-ws/client";
import type { WSServerClient } from "insite-ws/server";
import { IncomingTransfer } from "../IncomingTransfer";
import { IncomingTransport } from "../IncomingTransport";
import type { IncomingTransferTypes } from "../types";
import type { BrowserTransferTypes } from "./types";


export type { IncomingTransportOptions } from "../types";


class BrowserIncomingTransfer<
	WSORWSSC extends WS | WSServerClient = WS
> extends IncomingTransfer<WSORWSSC> {
	
	static types: IncomingTransferTypes<BrowserIncomingTransfer<WS>, BrowserTransferTypes> = {
		
		file: {
			setup() {
				
				if (this.collect)
					this.data = "";
				
			},
			
			collect(chunk) {
				this.data += chunk as string;// eslint-disable-line @typescript-eslint/restrict-plus-operands
				
			},
			
			done() {
				
				if (this.collect && this.encoding === "utf8")
					this.data = atob(this.data as string);
				
			}
		},
		
		...IncomingTransfer.types
		
	};
	
}

class BrowserIncomingTransport<
	WSORWSSC extends WS = WS
> extends IncomingTransport<WSORWSSC, BrowserIncomingTransfer<WSORWSSC>, BrowserTransferTypes> {
	
	static Transfer = BrowserIncomingTransfer;
	
}


export {
	BrowserIncomingTransfer as IncomingTransfer,
	BrowserIncomingTransport as IncomingTransport
};
