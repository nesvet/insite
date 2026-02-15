import type { AbilitiesSchema } from "insite-common";
import type { WSServerClient } from "./WSServerClient";


export type WSSCWithUser<_AS extends AbilitiesSchema, U = unknown, S = unknown> = WSServerClient & {
	user?: U;
	session?: S;
	sessionProps?: Record<string, unknown>;
	isRejected?: boolean;
	lastUserId?: string;
};
