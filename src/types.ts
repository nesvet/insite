import type { Document } from "insite-db";
import type { SubscriptionHandle } from "./SubscriptionHandle";


/* eslint-disable @typescript-eslint/no-explicit-any */


export type PartialWithId<D extends Document> = Partial<D> & { _id: string };

export type TransformableDoc<D extends Document> = PartialWithId<D> & { [key: string]: any };

export type PublicationProps<SA extends SubscriptionArgs> = {
	type?: "array" | "map" | "object";
	fetch?: (...args: SA) => unknown;
	fetchSubscription?: (subscription: SubscriptionHandle<SA>, reason?: any) => unknown;
	onSubscribe?: (subscription: SubscriptionHandle<SA>) => void;
	onUnsubscribe?: (subscription: SubscriptionHandle<SA>) => void;
};

export type SubscriptionArgs = unknown[];

export type SubscriptionHandler = (fetched: unknown, reason?: unknown) => void;

export type Projection = {
	[key: string]: Projection | boolean | number;
};
