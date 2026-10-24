import type { Cookie, CookieOptions } from "./types";


export type PendingCookie = [
	cookie: Cookie,
	options: CookieOptions,
	onSet?: () => void
];

export const tokenMap = new Map<string, PendingCookie>();
