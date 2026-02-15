import type { AnyProp, ExtendsOrOmit } from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import type { Config, Schema as ConfigSchema } from "insite-config";
import type { CookieMiddlewareOptions, Options as CookieSetterOptions } from "insite-cookie/server";
import type { Options as DBOptions } from "insite-db";
import type {
	GenericMiddleware,
	Options as HTTPServerOptions,
	StaticMiddlewareOptions,
	TemplateMiddlewareOptions
} from "insite-http";
import type { WithPublish, WithPublishCollection } from "insite-subscriptions-server/ws";
import type { Options as UsersOptions } from "insite-users-server";
import type {
	Options as UsersServerOptions,
	UsersServerWithActualProps as USWAP,
	WSSCWithUser
} from "insite-users-server-ws";
import type { IncomingTransportOptions, WithOnTransfer, WithTransfer } from "insite-ws-transfers";
import type { Options as WSServerOptions, WSServer, WSServerClient } from "insite-ws/server";


/* eslint-disable @typescript-eslint/no-explicit-any */


type DB = DBOptions;
type WSSSubscriptions = true;
type WSSIncomingTransport = IncomingTransportOptions | true;
type WSSOutgoingTransport = true;
type WSS<AS extends AbilitiesSchema> = WSServerOptions<WSSCWithUser<AS>> & {
	subscriptions?: WSSSubscriptions | null;
	incomingTransport?: WSSIncomingTransport | null;
	outgoingTransport?: WSSOutgoingTransport | null;
};
type UsersServer<AS extends AbilitiesSchema> = Omit<UsersServerOptions<AS>, "collections" | "incomingTransport" | "users" | "wss">;
type Users<AS extends AbilitiesSchema> = UsersOptions<AS> & {
	server?: UsersServer<AS>;
};
type Cookie<AS extends AbilitiesSchema> = Omit<CookieSetterOptions<AS>, "usersServer"> & {
	middleware?: CookieMiddlewareOptions;
};
type HTTP = (HTTPServerOptions & {
	static?: StaticMiddlewareOptions | null;
	template?: TemplateMiddlewareOptions | null;
	middlewares?: (GenericMiddleware | false | null | undefined)[];
}) | true;


export type Options<AS extends AbilitiesSchema> = {
	db?: DB;
	config?: ConfigSchema | null;
	ssl?: {
		cert: string;
		key: string;
	};
	port?: number | string;
	wss?: WSS<AS>;
	users?: Users<AS>;
	cookie?: Cookie<AS> | null;
	http?: HTTP;
	
	/** Is server public */
	public?: boolean;
};


type OptionsWithDB = AnyProp & { db: DB };
type OptionsWithConfig = OptionsWithDB & { config: ConfigSchema };
type OptionsWithWSS = AnyProp & { wss: WSS<any> };
type OptionsWithWSSSubscriptionHandler = AnyProp & { wss: AnyProp & { subscriptions?: WSSSubscriptions } };
type OptionsWithWSSIncomingTransport = (
	(OptionsWithUsers & { wss: AnyProp & { incomingTransport?: WSSIncomingTransport } }) |
	({ wss: AnyProp & { incomingTransport: WSSIncomingTransport } })
) & AnyProp;
type OptionsWithWSSOutgoingTransport = AnyProp & { wss: AnyProp & { outgoingTransport: WSSOutgoingTransport } };
type OptionsWithUsers = AnyProp & OptionsWithDB & { users: Users<any> };
type OptionsWithUsersServer = OptionsWithDB & OptionsWithUsers & OptionsWithWSSSubscriptionHandler;
type OptionsWithHTTP = AnyProp & { http: HTTP };
type OptionsWithCookie = OptionsWithHTTP & OptionsWithUsersServer & { cookie?: Cookie<any> };


export type OmitRedundant<I, O> =
	ExtendsOrOmit<O, OptionsWithDB, "collections" | "db" | "mongoClient",
		ExtendsOrOmit<O, OptionsWithConfig, "config",
			ExtendsOrOmit<O, OptionsWithWSS, "wss",
				ExtendsOrOmit<O, OptionsWithWSSSubscriptionHandler, "subscriptionHandler",
					ExtendsOrOmit<O, OptionsWithWSSIncomingTransport, "incomingTransport",
						ExtendsOrOmit<O, OptionsWithWSSOutgoingTransport, "outgoingTransport",
							ExtendsOrOmit<O, OptionsWithUsers, "users",
								ExtendsOrOmit<O, OptionsWithUsersServer, "usersServer",
									ExtendsOrOmit<O, OptionsWithHTTP, "http",
										ExtendsOrOmit<O, OptionsWithCookie, "cookie",
											I
										>
									>
								>
							>
						>
					>
				>
			>
		>
	>;

export type ServerConfig<O extends Options<any>> = Config<O["config"] extends ConfigSchema ? O["config"] : never>;


type OptionalPublish<O, AS extends AbilitiesSchema, W> =
	O extends OptionsWithWSSSubscriptionHandler ?
		O extends OptionsWithDB ?
			WithPublishCollection<W, AS> :
			WithPublish<W, AS> :
		W;

type OptionalTransfer<O, WSSC extends WSServerClient, W> =
	O extends OptionsWithWSSOutgoingTransport ?
		WithTransfer<W, WSSC> :
		W;

type OptionalOnTransfer<O, WSSC extends WSServerClient, W> =
	O extends OptionsWithWSSIncomingTransport ?
		WithOnTransfer<W, WSSC> :
		W;

export type WSServerWithActualProps<
	AS extends AbilitiesSchema,
	O,
	WSSC extends WSServerClient = WSSCWithUser<AS>
> =
	OptionalPublish<O, AS,
		OptionalTransfer<O, WSSC,
			OptionalOnTransfer<O, WSSC,
				WSServer<WSSC>
			>
		>
	>;


export type UsersServerWithActualProps<
	AS extends AbilitiesSchema,
	O extends Options<AS>
> = USWAP<
	AS,
	O extends OptionsWithUsersServer ? (
		(
			O["public"] extends boolean ? {
				public: O["public"];
			} : object
		) & O["users"]["server"] & {
			wss: WSServerWithActualProps<AS, O>;
			users: Omit<O["users"], "server">;
		}
	) : never
>;
