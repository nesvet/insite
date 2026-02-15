import type { AbilitiesSchema } from "insite-common";
import {
	Collection,
	type Document,
	type Filter,
	type Sort,
	type WatchedCollection
} from "insite-db";
import type { WSSCWithUser } from "insite-ws/server";
import type { Projection, PublicationProps, TransformableDoc } from "../types";
import type { CollectionMapPublication } from "./CollectionMapPublication";
import type { Publication } from "./Publication";


/* eslint-disable @typescript-eslint/no-explicit-any */


export type WSSubscriptionArgs<
	AS extends AbilitiesSchema,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> = [ WSSCWithUser<AS, U, S>, ...RA ];


export type PublicationArgs<
	AS extends AbilitiesSchema,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> = [
	name: string,
	props?: PublicationProps<WSSubscriptionArgs<AS, RA, U, S>>
];

export type WithPublish<T, AS extends AbilitiesSchema> = T & {
	publish<RA extends any[], U = unknown, S = unknown>(...args: PublicationArgs<AS, RA, U, S>): Publication<AS, RA, U, S>;
};


type QueryProps<D extends Document> = {
	query?: Filter<D>;
	projection?: Projection;
	sort?: Sort;
	triggers?: string[];
};

export type CollectionMapPublicationArgs<
	AS extends AbilitiesSchema,
	D extends Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
> = [
	collection: WatchedCollection<D>,
	name: string,
	queryProps?: ((...args: WSSubscriptionArgs<AS, RA, U, S>) => QueryProps<D> | false | null | void) | QueryProps<D> | false | null,
	transform?: (doc: TransformableDoc<D>, args: WSSubscriptionArgs<AS, RA, U, S>) => void
];

export type WithPublishCollection<T, AS extends AbilitiesSchema> = T & WithPublish<T, AS> & {
	publish<RA extends any[], D extends Document, U = unknown, S = unknown>(...args: CollectionMapPublicationArgs<AS, D, RA, U, S>): CollectionMapPublication<AS, D, RA, U, S>;
};


export function isPublicationCollectionMap<
	AS extends AbilitiesSchema,
	D extends Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
>(
	publication: CollectionMapPublication<AS, D, RA, U, S> | Publication<AS, RA, U, S>
): publication is CollectionMapPublication<AS, D, RA, U, S> {
	return publication.type === "map";
}

export function isCollectionMapPublicationArgs<
	AS extends AbilitiesSchema,
	D extends Document,
	RA extends any[] = any[],
	U = unknown,
	S = unknown
>(args: CollectionMapPublicationArgs<AS, D, RA, U, S> | PublicationArgs<AS, RA, U, S>): args is CollectionMapPublicationArgs<AS, D, RA, U, S> {
	return args[0] instanceof Collection;
}
