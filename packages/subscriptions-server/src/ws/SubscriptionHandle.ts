import type { AbilitiesSchema } from "insite-common";
import { SubscriptionHandle as GenericSubscriptionHandle } from "../SubscriptionHandle";
import type { WSSubscriptionArgs } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-constructor */


export class SubscriptionHandle<
	AS extends AbilitiesSchema = AbilitiesSchema,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> extends GenericSubscriptionHandle<WSSubscriptionArgs<AS, RA, U, S>> {
	constructor(...args: ConstructorParameters<typeof GenericSubscriptionHandle<WSSubscriptionArgs<AS, RA, U, S>>>) {
		super(...args);
	}
}
