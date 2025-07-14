import type { ServerOptions } from "ws";
import type { WSServerClient } from "./WSServerClient";


/* eslint-disable @typescript-eslint/no-explicit-any */


export type Options<WSSC extends WSServerClient> = Omit<ServerOptions<typeof WSServerClient>, "port"> & {
	
	/**
	 * Icon for console logs
	 * @default "🔌"
	 */
	icon?: string;
	
	/**
	 * Name
	 * @default "WS"
	 */
	name?: string;
	
	ssl?: {
		cert: Buffer | string;
		key: Buffer | string;
	};
	port?: number | string;
	WebSocket?: typeof WSServerClient & {
		new (...args: any[]): WSSC;
	};
	quiet?: boolean;
};

export type RequestListener<WSSC extends WSServerClient> = (wscc: WSSC, ...args: any[]) => any;

export type CompatibleListener = () => void;
