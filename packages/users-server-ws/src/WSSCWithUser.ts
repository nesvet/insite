import type { AbilitiesSchema } from "insite-common";
import type { Session, SessionDoc, User } from "insite-users-server";
import { WSServerClient } from "insite-ws/server";


export class WSSCWithUser<AS extends AbilitiesSchema> extends WSServerClient {
	isRejected?: boolean;
	sessionProps?: Partial<SessionDoc>;
	user?: User<AS>;
	lastUserId?: string;
	session?: Session<AS>;
}
