import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import { random, setWithTimeout } from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import type { UsersServer, WSSCWithUser } from "insite-users-server-ws";
import { headers } from "../common";
import { parseCookie } from "./parse";
import { tokenMap } from "./tokenMap";
import type { Cookie, CookieOptions } from "./types";


const cookieTokenTimeout = 2000;

/** Auth.js default: rewrite the session cookie at most once a day. */
const defaultUpdateAge = 86_400;

export type Options<AS extends AbilitiesSchema> = {
	usersServer: UsersServer<AS>;
	domain?: string;
	/** Cookie `Max-Age` in seconds. Defaults to the session TTL. */
	maxAge?: number;
	/**
	 * Minimum seconds between cookie rewrites.
	 * `0` rewrites on every prolonged connect.
	 * Defaults to one day, or half of `maxAge` when that is shorter.
	 */
	updateAge?: number;
};


export class CookieSetter<AS extends AbilitiesSchema> {
	constructor({ usersServer, domain, maxAge, updateAge }: Options<AS>) {
		this.usersServer = usersServer;
		this.domain = domain ?? process.env.INSITE_HOST;
		this.maxAge = maxAge ?? this.usersServer.users.sessions.collection.expireAfterSeconds;
		this.updateAge = updateAge ?? Math.min(defaultUpdateAge, Math.floor(this.maxAge / 2));
		
		this.usersServer.wss.on("client-connect", this.#handleClientConnect);
		this.usersServer.wss.on("client-session", this.#handleClientSession);
		this.usersServer.users.on("session-delete", this.#handleSessionDelete);
		
	}
	
	#wsSessionIdMap = new WeakMap<WSSCWithUser<AS>, string | null>();
	
	/** When the cookie handoff last completed. Absent entries fall back to `createdAt`. `0` means the last attempt expired. */
	#cookieSetAtBySessionId = new Map<string, number>();
	
	/** Session ids with a cookie token that has not been redeemed or expired yet. */
	#cookieWritePending = new Set<string>();
	
	usersServer;
	domain;
	maxAge;
	
	/** Seconds. A connect inside this window prolongs the document and leaves the cookie alone. */
	updateAge;
	
	set(wssc: WSSCWithUser<AS>, cookie: Cookie, options: CookieOptions, onSet?: () => void) {
		
		const token = `${Math.round(performance.now() * Number.MAX_SAFE_INTEGER).toString(36)}$${crypto.randomBytes(random(4, 8)).toString("hex")}`;
		
		setWithTimeout(tokenMap, token, [ cookie, options, onSet ], cookieTokenTimeout);
		
		wssc.sendMessage(headers.set, token);
		
	}
	
	unset(wssc: WSSCWithUser<AS>, names: string[]) {
		this.set(wssc, names.reduce((cookie, name) => {
			cookie[name] = "";
			
			return cookie;
		}, {} as Cookie), { domain: this.domain, maxAge: 0 });
		
	}
	
	#handleClientConnect = (wssc: WSSCWithUser<AS>, request: IncomingMessage) => {
		this.#wsSessionIdMap.set(wssc, null);
		
		if (request.headers.cookie) {
			const { sessionId = null } = parseCookie(request.headers.cookie) as { sessionId: string | null };
			
			this.#wsSessionIdMap.set(wssc, sessionId);
			
			if (sessionId)
				this.usersServer.setSession(wssc, sessionId, true);
		}
		
	};
	
	#handleClientSession = (wssc: WSSCWithUser<AS>, shouldProlong?: boolean) => {
		const sessionId = wssc.session?._id ?? null;
		
		if (this.#wsSessionIdMap.get(wssc) !== sessionId) {
			this.#wsSessionIdMap.set(wssc, sessionId);
			
			if (wssc.isOpen && wssc.session)
				this.#writeSessionCookie(wssc);
			else
				this.unset(wssc, [ "sessionId" ]);
		} else if (shouldProlong && wssc.isOpen && wssc.session && this.#isCookieStale(wssc.session)) {
			this.#writeSessionCookie(wssc);
		}
		
	};
	
	#handleSessionDelete = (session: { _id: string }) => {
		this.#cookieSetAtBySessionId.delete(session._id);
		this.#cookieWritePending.delete(session._id);
		
	};
	
	#writeSessionCookie(wssc: WSSCWithUser<AS>) {
		const session = wssc.session;
		
		if (!session || this.#cookieWritePending.has(session._id))
			return;
		
		this.#cookieWritePending.add(session._id);
		
		const pendingTimeout = setTimeout(() => {
			this.#cookieWritePending.delete(session._id);
			
			if (!this.#cookieSetAtBySessionId.has(session._id))
				this.#cookieSetAtBySessionId.set(session._id, 0);
		}, cookieTokenTimeout);
		
		this.set(wssc, { sessionId: session._id }, { domain: this.domain, maxAge: this.maxAge }, () => {
			clearTimeout(pendingTimeout);
			this.#cookieWritePending.delete(session._id);
			this.#cookieSetAtBySessionId.set(session._id, Date.now());
		});
		
	}
	
	#isCookieStale(session: { _id: string; createdAt: number }) {
		const setAt = this.#cookieSetAtBySessionId.get(session._id) ?? session.createdAt;
		
		return Date.now() - setAt >= this.updateAge * 1000;
	}
	
	
	static parse = parseCookie;
	
}
