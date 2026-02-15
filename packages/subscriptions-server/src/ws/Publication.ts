import type { AbilitiesSchema } from "insite-common";
import { Publication as GenericPublication } from "../Publication";
import type { WSSubscriptionArgs } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-constructor */


export class Publication<
	AS extends AbilitiesSchema = AbilitiesSchema,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> extends GenericPublication<WSSubscriptionArgs<AS, RA, U, S>> {
	constructor(...args: ConstructorParameters<typeof GenericPublication<WSSubscriptionArgs<AS, RA, U, S>>>) {
		super(...args);
	}
}
