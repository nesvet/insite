import type { AnyProp, ExtendsOrOmit } from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import type { Collections } from "insite-db";
import type { Options as UsersOptions, Users } from "insite-users-server";
import type { IncomingTransport, WithOptionalOnTransfer } from "insite-ws-transfers/node";
import type { WSServer } from "insite-ws/server";
import type {
	OrgsExtendedPublicationOptions,
	OrgsPublicationOptions,
	RolesPublicationOptions,
	UserPublicationOptions,
	UsersExtendedPublicationOptions,
	UsersPublicationOptions
} from "./publications";
import type { UsersServer } from "./UsersServer";
import type { WSSCWithUser } from "./WSSCWithUser";


export type Options<AS extends AbilitiesSchema> = {
	wss: WithOptionalOnTransfer<WSServer<WSSCWithUser<AS>>, WSSCWithUser<AS>>;
	collections?: Collections;
	
	/** Is server public  */
	public?: boolean;
	
	users: Users<AS> | UsersOptions<AS>;
	publication?: UsersPublicationOptions;
	extendedPublication?: UsersExtendedPublicationOptions;
	userPublication?: UserPublicationOptions;
	roles?: {
		publication?: RolesPublicationOptions;
	};
	orgs?: {
		publication?: OrgsPublicationOptions;
		extendedPublication?: OrgsExtendedPublicationOptions;
	};
	incomingTransport?: IncomingTransport<WSSCWithUser<AS>>;
};


type OptionsWithoutPublicOnly = AnyProp & { public?: false };


export type OmitRedundant<US, O> =
	ExtendsOrOmit<O, OptionsWithoutPublicOnly, "abilitiesPublication" | "orgsExtendedPublication" | "orgsPublication" | "rolesPublication" | "sessionsPublication" | "usersExtendedPublication" | "usersPublication",
		US
	>;

export type UsersServerWithActualProps<AS extends AbilitiesSchema, O extends Options<AS>> = OmitRedundant<UsersServer<AS>, O>;
