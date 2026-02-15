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

export type Options<AS extends AbilitiesSchema> = {
	usersServer: UsersServer<AS>;
	domain?: string;
	maxAge?: number;
};


export class CookieSetter<AS extends AbilitiesSchema> {
	constructor({ usersServer, domain, maxAge }: Options<AS>) {
		this.usersServer = usersServer;
		this.domain = domain ?? process.env.INSITE_HOST;
		this.maxAge = maxAge ?? this.usersServer.users.sessions.collection.expireAfterSeconds;
		
		this.usersServer.wss.on("client-connect", this.#handleClientConnect);
		this.usersServer.wss.on("client-session", this.#handleClientSession);
		
	}
	
	#wsSessionIdMap = new WeakMap<WSSCWithUser<AS>, string | null>();
	
	usersServer;
	domain;
	maxAge;
	
	set(wssc: WSSCWithUser<AS>, cookie: Cookie, options: CookieOptions) {
		
		const token = `${Math.round(performance.now() * Number.MAX_SAFE_INTEGER).toString(36)}$${crypto.randomBytes(random(4, 8)).toString("hex")}`;
		
		setWithTimeout(tokenMap, token, [ cookie, options ], cookieTokenTimeout);
		
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
	
	#handleClientSession = (wssc: WSSCWithUser<AS>) => {
		if (this.#wsSessionIdMap.get(wssc) !== wssc.session?._id) {
			this.#wsSessionIdMap.set(wssc, wssc.session?._id ?? null);
			
			if (wssc.isOpen && wssc.session)
				this.set(wssc, { sessionId: wssc.session._id }, { domain: this.domain, maxAge: this.maxAge });
			else
				this.unset(wssc, [ "sessionId" ]);
		}
		
	};
	
	
	static parse = parseCookie;
	
}
