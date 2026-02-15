import type { WS } from "./WS";


/* eslint-disable @typescript-eslint/no-explicit-any */


declare global {
	var __insite: {
		wss_url?: string;
	} | undefined;
}

export type Options = {
	url?: URL | string;
	name?: string;
	protocols?: string[];
	immediately?: boolean;
	reconnectAfter?: number | null;
	on?: Record<string, (...args: any[]) => void>;
	once?: Record<string, (...args: any[]) => void>;
	quiet?: boolean;
	signal?: AbortSignal;
};

export type RequestListener = (...args: any[]) => unknown;

export type ConnectionQuality = typeof WS["CONNECTION_QUALITY"][keyof typeof WS["CONNECTION_QUALITY"]];
