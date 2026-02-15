import { StatefulPromise } from "@nesvet/n";
import { createServer, type AbilitiesSchema } from "insite-common/backend";
import { init as initConfig } from "insite-config";
import { CookieMiddleware, CookieSetter } from "insite-cookie/server";
import {
	connect,
	type Collections,
	type DB,
	type MongoClient
} from "insite-db";
import {
	ClassMiddleware,
	HTTPServer,
	StaticMiddleware,
	TemplateMiddleware
} from "insite-http";
import { SubscriptionHandler } from "insite-subscriptions-server/ws";
import { Users } from "insite-users-server";
import { UsersServer, type WSSCWithUser } from "insite-users-server-ws";
import { IncomingTransport, OutgoingTransport } from "insite-ws-transfers/node";
import { WSServer } from "insite-ws/server";
import type {
	OmitRedundant,
	Options,
	ServerConfig,
	UsersServerWithActualProps,
	WSServerWithActualProps
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class InSite<
	O extends Options<any>,
	AS extends AbilitiesSchema = O extends Options<infer A> ? A : never
> {
	constructor(options?: O) {
		if (options)
			void this.init(options);
		
	}
	
	mongoClient!: MongoClient;
	db!: DB;
	config!: ServerConfig<O>;
	collections!: Collections;
	wss!: WSServerWithActualProps<AS, O>;
	incomingTransport!: IncomingTransport<WSSCWithUser<AS>>;
	outgoingTransport!: OutgoingTransport<WSSCWithUser<AS>>;
	subscriptionHandler!: SubscriptionHandler<AS>;
	usersServer!: UsersServerWithActualProps<AS, O>;
	users!: Users<AS>;
	cookie!: CookieSetter<AS>;
	http!: HTTPServer;
	
	#isInited = false;
	
	protected async init(options: O) {
		
		if (!this.#isInited) {
			this.#isInited = true;
			
			const {
				db: dbOptions,
				config: configSchema,
				ssl,
				port,
				wss: wssWithOtherOptions,
				users: usersWithServerOptions,
				cookie: cookieWithMiddlewareOptions,
				http: httpWithMiddlewareOptions,
				public: isPublic
			} = options;
			
			if (dbOptions)
				({
					client: this.mongoClient,
					db: this.db,
					collections: this.collections
				} = await connect(dbOptions));
			
			if (this.collections && configSchema)
				this.config = await initConfig(this.collections, configSchema) as ServerConfig<O>;
			
			const server =
				port && (wssWithOtherOptions || httpWithMiddlewareOptions) ?
					await createServer({
						...wssWithOtherOptions && WSServer.makeProps({ ...wssWithOtherOptions, ssl }),
						...httpWithMiddlewareOptions && HTTPServer.makeProps({ ...typeof httpWithMiddlewareOptions == "object" ? httpWithMiddlewareOptions : {}, ssl })
					}, port) :
					undefined;
			
			if (wssWithOtherOptions) {
				const {
					subscriptions,
					incomingTransport: incomingTransportOptions,
					outgoingTransport,
					...wssOptions
				} = wssWithOtherOptions;
				
				this.wss = new WSServer<WSSCWithUser<AS>>({
					server,
					...wssOptions
				}) as WSServerWithActualProps<AS, O>;
				
				if (subscriptions !== null)
					this.subscriptionHandler = new SubscriptionHandler(this.wss, !!this.collections);
				
				if (incomingTransportOptions !== null && (incomingTransportOptions || (this.collections && usersWithServerOptions)))
					this.incomingTransport = new IncomingTransport(this.wss, !incomingTransportOptions || incomingTransportOptions === true ? {} : incomingTransportOptions);
				
				if (outgoingTransport)
					this.outgoingTransport = new OutgoingTransport(this.wss);
			}
			
			if (usersWithServerOptions && this.collections) {
				const { server: usersServerOptions, ...usersOptions } = usersWithServerOptions;
				
				if (this.wss && this.subscriptionHandler) {
					this.usersServer = await UsersServer.init({
						public: isPublic,
						...usersServerOptions,
						users: usersOptions,
						wss: this.wss,
						collections: this.collections,
						incomingTransport: this.incomingTransport
					}) as NonNullable<UsersServerWithActualProps<AS, O>>;
					
					this.users = this.usersServer.users;
				} else
					this.users = await Users.init(this.collections, usersOptions);
			}
			
			if (httpWithMiddlewareOptions) {
				const {
					static: staticMiddlewareOptions = undefined, // eslint-disable-line unicorn/no-useless-undefined
					middlewares = undefined, // eslint-disable-line unicorn/no-useless-undefined
					template: templateMiddlewareOptions = undefined, // eslint-disable-line unicorn/no-useless-undefined
					...httpOptions
				} = typeof httpWithMiddlewareOptions == "object" ? httpWithMiddlewareOptions : {};
				
				this.http = new HTTPServer({
					server,
					...httpOptions
				}, [
					...middlewares ?? [],
					cookieWithMiddlewareOptions !== null && new CookieMiddleware(cookieWithMiddlewareOptions?.middleware ?? {}),
					staticMiddlewareOptions !== null && new StaticMiddleware(staticMiddlewareOptions ?? {}),
					templateMiddlewareOptions !== null && new TemplateMiddleware(templateMiddlewareOptions ?? {})
				].filter(Boolean) as ClassMiddleware[]);
			}
			
			if (cookieWithMiddlewareOptions !== null && this.usersServer && this.http) {
				const {
					middleware: _,
					...cookieOptions
				} = cookieWithMiddlewareOptions ?? {};
				
				this.cookie = new CookieSetter<AS>({
					...cookieOptions,
					usersServer: this.usersServer as UsersServer<AS>
				});
			}
			
			this.#initPromise.resolve(this);
		}
		
	}
	
	#initPromise = new StatefulPromise<this>();
	
	whenReady() {
		return this.#initPromise;
	}
	
	static init<IO extends Options<any>, IS extends InSite<IO>>(options: IO, asPromise?: true): Promise<OmitRedundant<IS, IO>>;
	static init<IO extends Options<any>, IS extends InSite<IO>>(options: IO, asPromise: false): OmitRedundant<IS, IO>;
	static init<IO extends Options<any>, IS extends InSite<IO>>(options: IO, asPromise = true) {
		const inSite = new InSite(options) as IS;
		
		return asPromise ?
			inSite.whenReady() :
			inSite;
	}
	
}
