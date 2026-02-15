import type { AbilitiesSchema } from "insite-common";
import type { Document } from "insite-db";
import {
	CollectionMapSubscriptionHandle as GenericCollectionMapSubscriptionHandle
} from "../CollectionMapSubscriptionHandle";
import type { WSSubscriptionArgs } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-constructor */


export class CollectionMapSubscriptionHandle<
	AS extends AbilitiesSchema = AbilitiesSchema,
	D extends Document = Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> extends GenericCollectionMapSubscriptionHandle<D, WSSubscriptionArgs<AS, RA, U, S>> {
	constructor(...args: ConstructorParameters<typeof GenericCollectionMapSubscriptionHandle<D, WSSubscriptionArgs<AS, RA, U, S>>>) {
		super(...args);
	}
}
