import type { AbilitiesSchema } from "insite-common";
import type { Document, WatchedCollection } from "insite-db";
import { CollectionMapPublication as GenericCollectionMapPublication } from "../CollectionMapPublication";
import type { WSSubscriptionArgs } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-constructor */


type RestArgs<
	AS extends AbilitiesSchema = AbilitiesSchema,
	D extends Document = Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown,
	T extends abstract new (...args: any) => any = typeof GenericCollectionMapPublication<D, WSSubscriptionArgs<AS, RA, U, S>>
> = T extends abstract new (first: any, ...rest: infer R) => any ? R : never;


export class CollectionMapPublication<
	AS extends AbilitiesSchema = AbilitiesSchema,
	D extends Document = Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> extends GenericCollectionMapPublication<D, WSSubscriptionArgs<AS, RA, U, S>> {
	constructor(collection: WatchedCollection<D>, ...restArgs: RestArgs<AS, D, RA, U, S>) {
		super(collection, ...restArgs);
	}
}
