import type { WS } from "insite-ws/client";
import type {
	IncomingTransferListener,
	IncomingTransferListenerOptions,
	OutgoingTransferProps,
	TransferTypes
} from "../types";
import type { IncomingTransfer, IncomingTransport } from "./incoming";
import type { OutgoingTransfer } from "./outgoing";


export type BrowserTransferTypes = Exclude<TransferTypes, "stream">;


type Transfer<W extends WS> = {
	transfer: <
		T extends OutgoingTransfer<W>,
		TP extends BrowserTransferTypes
	>(ws: W, kind: string, props: OutgoingTransferProps<W, T, TP>) => T;
};

export type WithTransfer<W extends WS> = Transfer<W> & W;

export type WithOptionalTransfer<W extends WS> = Partial<Transfer<W>> & W;


type OnTransfer<W extends WS> = {
	onTransfer: <
		T extends IncomingTransfer<W>
	>(kind: string, listener: IncomingTransferListener<W, T>, options?: IncomingTransferListenerOptions) => IncomingTransport<W>;
	onceTransfer: <
		T extends IncomingTransfer<W>
	>(kind: string, listener: IncomingTransferListener<W, T>, listenerOptions?: Omit<IncomingTransferListenerOptions, "once">) => IncomingTransport<W>;
};

export type WithOnTransfer<W extends WS> = OnTransfer<W> & W;

export type WithOptionalOnTransfer<W extends WS> = Partial<OnTransfer<W>> & W;
