import type {
	SubscriptionArrayWithSubscription,
	Updated as SubscriptionArrayUpdated,
	Updates as SubscriptionArrayUpdates
} from "../SubscriptionArray";
import type {
	SubscriptionMapWithSubscription,
	Updated as SubscriptionMapUpdated,
	Updates as SubscriptionMapUpdates
} from "../SubscriptionMap";
import type {
	SubscriptionObjectWithSubscription,
	Updated as SubscriptionObjectUpdated,
	Updates as SubscriptionObjectUpdates
} from "../SubscriptionObject";
import type { SubscriptionGroup } from "./SubscriptionGroup";


/* eslint-disable @typescript-eslint/no-explicit-any */


export type SubscriptionType = "array" | "map" | "object";

export type SubscriptionUpdated<T> =
	T extends "array" ?
		SubscriptionArrayUpdated<any> :
		T extends "map" ?
			SubscriptionMapUpdated<any> :
			T extends "object" ?
				SubscriptionObjectUpdated :
				never;

export type SubscriptionValue<T> =
	T extends "array" ?
		SubscriptionArrayWithSubscription<any> :
		T extends "map" ?
			SubscriptionMapWithSubscription<any> :
			T extends "object" ?
				SubscriptionObjectWithSubscription :
				never;

export type SubscriptionHandle<T> =
	T extends "array" ?
		(updated: SubscriptionArrayUpdated<any> | null, group: SubscriptionGroup) => void :
		T extends "map" ?
			(updated: SubscriptionMapUpdated<any> | null, group: SubscriptionGroup) => void :
			T extends "object" ?
				(updated: SubscriptionObjectUpdated | null, group: SubscriptionGroup) => void :
				never;

export type SubscriptionOnBeforeInit<T> =
	T extends "array" ?
		(value: SubscriptionArrayWithSubscription<any>) => void :
		T extends "map" ?
			(value: SubscriptionMapWithSubscription<any>) => void :
			T extends "object" ?
				(value: SubscriptionObjectWithSubscription) => void :
				never;

export type SubscriptionUpdates<T> =
	T extends "array" ?
		SubscriptionArrayUpdates :
		T extends "map" ?
			SubscriptionMapUpdates :
			T extends "object" ?
				SubscriptionObjectUpdates :
				never;

export type Definition<T extends SubscriptionType = SubscriptionType> = {
	name: string;
	value?: SubscriptionValue<T>;
	type?: T;
	publicationName?: string;
	params?: unknown[];
	handle?: (...args: any[]) => void;
	onBeforeInit?: (...args: any[]) => void;
	debounce?: number;
	preventBind?: boolean;
};

export type TupleDefinition = unknown[];

export type UnparsedDefinition<T extends SubscriptionType = SubscriptionType> = Definition<T> | TupleDefinition;

type ResolveObjectValue<T> =
	T extends { value: infer V } ? V :
	T extends { type: "array" } ? SubscriptionArrayWithSubscription<any> :
	T extends { type: "map" } ? SubscriptionMapWithSubscription<any> :
	T extends { type: "object" } ? SubscriptionObjectWithSubscription :
	SubscriptionObjectWithSubscription;

type ResolveArrayValue<T extends any[]> =
	T[1] extends object ? T[1] :
	T[1] extends "array" ? SubscriptionArrayWithSubscription<any> :
	T[1] extends "map" ? SubscriptionMapWithSubscription<any> :
	T[1] extends "object" ? SubscriptionObjectWithSubscription :
	SubscriptionObjectWithSubscription;

type ResolveValue<U> =
	U extends object ?
		ResolveObjectValue<U> :
		U extends any[] ?
			ResolveArrayValue<U> :
			never;

export type ParseValues<T extends Array<any[] | object>> =
	T &
	{
		[K in keyof T as T[K] extends { name: infer N } ?
			N extends string ?
				N :
				never :
			T[K] extends [infer F, any] ?
				F extends string ?
					F :
					never :
				never
		]: ResolveValue<T[K]>;
	} extends Array<infer U> ?
		ResolveValue<U>[] :
		never;
