import type { WS } from "insite-ws/client";
import type { WSServer, WSServerClient } from "insite-ws/server";
import { headers } from "./common";
import { OutgoingTransfer } from "./OutgoingTransfer";
import type {
	OutgoingTransferHandles,
	OutgoingTransferProps,
	ParametersWithoutFirst,
	TransferTypes
} from "./types";


export class OutgoingTransport<
	WSORWSSC extends WS | WSServerClient,
	T extends OutgoingTransfer<WSORWSSC>,
	Types extends TransferTypes = TransferTypes
> {
	constructor(ws: WS | WSServer<Exclude<WSORWSSC, WS>>) {
		
		if (ws.isWebSocketServer) {
			ws.on(`client-message:${headers.confirm}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(wssc, ...args));
			ws.on(`client-message:${headers.progress}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(wssc, ...args));
			ws.on(`client-message:${headers.completed}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(wssc, ...args));
			ws.on(`client-message:${headers.error}`, (wssc: Exclude<WSORWSSC, WS>, ...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(wssc, ...args));
			
			Object.assign(ws, {
				transfer: (wssc: Exclude<WSORWSSC, WS>, kind: string, props: OutgoingTransferProps<WSORWSSC, T, Types>) =>
					this.transfer(wssc, kind, props)
			});
		} else {
			ws.on(`message:${headers.confirm}`, (...args: ParametersWithoutFirst<typeof this.handleConfirm>) => this.handleConfirm(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.progress}`, (...args: ParametersWithoutFirst<typeof this.handleProgress>) => this.handleProgress(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.completed}`, (...args: ParametersWithoutFirst<typeof this.handleCompleted>) => this.handleCompleted(ws as WSORWSSC, ...args));
			ws.on(`message:${headers.error}`, (...args: ParametersWithoutFirst<typeof this.handleError>) => this.handleError(ws as WSORWSSC, ...args));
			
			Object.assign(ws, {
				transfer: (kind: string, props: OutgoingTransferProps<WSORWSSC, T, Types>) =>
					this.transfer(ws as WSORWSSC, kind, props)
			});
		}
		
	}
	
	#transfers = new Map<string, T>();
	
	#transferHandles: OutgoingTransferHandles = {
		delete: (id: string) => this.#transfers.delete(id)
	};
	
	transfer(ws: WSORWSSC, kind: string, props: OutgoingTransferProps<WSORWSSC, T, Types>) {
		
		const { Transfer } = this.constructor as typeof OutgoingTransport;// eslint-disable-line @typescript-eslint/naming-convention
		
		const transfer = new Transfer(ws, kind, props, this.#transferHandles);
		
		this.#transfers.set(transfer.id, transfer as T);
		
		return transfer;
	}
	
	private async handleConfirm(ws: WSORWSSC, id: string, confirmResponse: string) {
		await this.#transfers.get(id)?.handleConfirm(confirmResponse);
		
	}
	
	private handleProgress(ws: WSORWSSC, id: string, progress: number) {
		this.#transfers.get(id)?.handleProgress(progress);
		
	}
	
	private async handleCompleted(ws: WSORWSSC, id: string) {
		await this.#transfers.get(id)?.handleCompleted();
		
	}
	
	private handleError(ws: WSORWSSC, id: string, errorMessage: string) {
		this.#transfers.get(id)?.throw(errorMessage);
		
	}
	
	
	static Transfer = OutgoingTransfer;
	
}
