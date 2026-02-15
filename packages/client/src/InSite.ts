import EventEmitter from "eventemitter3";
import { StatefulPromise } from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import { CookieSetter } from "insite-cookie/client";
import { Subscription } from "insite-subscriptions-client";
import {
	UsersSubscriptionGroup,
	type CurrentUser,
	type Orgs,
	type OrgsExtended,
	type Roles,
	type Users,
	type UsersExtended
} from "insite-users-client";
import { IncomingTransport, OutgoingTransport } from "insite-ws-transfers/browser";
import { WS } from "insite-ws/client";
import type { OmitRedundant, Options, WSWithActualProps } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


/** @this InSite */
function login<O extends Options<any>>(this: InSite<O>, email: string, password: string) {
	return this.ws.sendRequest("login", email, password);
}

/** @this InSite */
function logout<O extends Options<any>>(this: InSite<O>) {
	return this.ws.sendRequest("logout");
}


export class InSite<
	O extends Options<any>,
	AS extends AbilitiesSchema = O extends Options<infer A> ? A : never
> extends EventEmitter {
	constructor(options?: O) {
		super();
		
		if (options)
			void this.init(options);
		
	}
	
	ws!: WSWithActualProps<O>;
	incomingTransport!: IncomingTransport;
	outgoingTransport!: OutgoingTransport;
	cookie!: CookieSetter;
	usersSubscriptionGroup!: UsersSubscriptionGroup;
	user!: CurrentUser<AS> | null;
	users!: Users | UsersExtended;
	orgs!: Orgs | OrgsExtended;
	roles!: Roles;
	isLoggedIn = false;
	
	login!: typeof login<O>;
	logout!: typeof logout<O>;
	
	isReady = false;
	
	protected async init(options?: O) {
		
		if (!this.isReady) {
			const {
				ws: wsWithOtherOptions = {},
				cookie: cookieOptions,
				users,
				public: isPublic
			} = options ?? {};
			
			const {
				subscriptions,
				incomingTransport,
				outgoingTransport,
				...wsOptions
			} = wsWithOtherOptions;
			
			this.ws = new WS(wsOptions) as WSWithActualProps<O>;
			
			if (subscriptions !== null)
				Subscription.bindTo(this.ws);
			
			if (incomingTransport)
				this.incomingTransport = new IncomingTransport(this.ws, typeof incomingTransport == "object" ? incomingTransport : {});
			
			if (outgoingTransport)
				this.outgoingTransport = new OutgoingTransport(this.ws);
			
			if (cookieOptions !== null)
				this.cookie = new CookieSetter(this.ws, cookieOptions);
			
			if (users !== null && subscriptions !== null && cookieOptions !== null) {
				this.user = null;
				this.login = login<O>;
				this.logout = logout<O>;
				
				if (isPublic)
					await new Promise<void>(resolve => {
						
						new Subscription("object", "user", [ true ], user => {
							this.user = user;
							
							if (this.user) {
								if (!this.isLoggedIn) {
									this.isLoggedIn = true;
									this.emit("login", true);
								}
							} else if (this.isLoggedIn) {
								this.isLoggedIn = false;
								this.emit("logout", false);
							}
							
							if (!this.isReady)
								resolve();
							
						});
						
					});
				else {
					this.usersSubscriptionGroup = new UsersSubscriptionGroup({ target: this });
					
					await new Promise<void>(resolve => {
						
						this.usersSubscriptionGroup.once("init", () => {
							
							this.isLoggedIn = !!this.user;
							
							this.usersSubscriptionGroup.on("update.user", (user: CurrentUser) => {
								if (user.valueOf()) {
									if (!this.isLoggedIn) {
										this.isLoggedIn = true;
										this.emit("login", true);
									}
								} else if (this.isLoggedIn) {
									this.isLoggedIn = false;
									this.emit("logout", false);
								}
								
							});
							
							resolve();
							
							if (this.isLoggedIn)
								this.emit("login", true);
							
						});
						
					});
				}
			}
			
			this.isReady = true;
			this.emit("ready", true);
			
			this.#initPromise.resolve(this);
		}
		
	}
	
	#initPromise = new StatefulPromise<this>();
	
	whenReady() {
		return this.#initPromise;
	}
	
	
	static init<IO extends Options<any>, IS extends InSite<IO>>(options: IO, asPromise: true): Promise<OmitRedundant<IS, IO>>;
	static init<IO extends Options<any>, IS extends InSite<IO>>(options?: IO, asPromise?: false): OmitRedundant<IS, IO>;
	static init<IO extends Options<any>, IS extends InSite<IO>>(options?: IO, asPromise = false) {
		const inSite = new InSite(options) as IS;
		
		return asPromise ?
			inSite.whenReady() :
			inSite;
	}
	
}
