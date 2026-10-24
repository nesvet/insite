import type { Cookie, CookieOptions } from "./types";


type PendingCookie = [
	cookie: Cookie,
	options: CookieOptions,
	onSet?: () => void
];

export const tokenMap = new Map<string, PendingCookie>();
