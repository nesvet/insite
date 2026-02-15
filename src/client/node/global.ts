import WebSocket from "ws";


declare global {
	var WebSocket: typeof WebSocket;// eslint-disable-line @typescript-eslint/naming-convention
}

globalThis.WebSocket = WebSocket as any;// eslint-disable-line @typescript-eslint/no-explicit-any
