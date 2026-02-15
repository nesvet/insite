import type { CollectionOptions as CommonCollectionOptions } from "insite-db";
import { updatedAtKey, updatedAtSymbol } from "./symbols";


export type Schema = Record<string, Record<string, boolean | number | string | null>>;

export type CollectionOptions = Omit<CommonCollectionOptions, "fullDocument" | "watch">;

export type ConfigItemID<S extends Schema> = NonNullable<Exclude<Extract<keyof S, string>, "addListener" | "off" | "on" | "removeListener" | "update">>;

export type Listener<CI extends Config<Schema>[ConfigItemID<Schema>]> = (this: CI, updatedFields: Partial<CI>, prevFields: Partial<CI>) => Promise<void> | void;

export type Updates<CI extends Config<Schema>[ConfigItemID<Schema>]> = Partial<Omit<CI, typeof updatedAtKey> & { [updatedAtSymbol]: number }>;

type AddListener<S extends Schema> = {
	<ID extends ConfigItemID<S>>(_id: ID, listener: Listener<Config<S>[ID]>, immediately?: boolean): void;
};

type RemoveListener<S extends Schema> = {
	<ID extends ConfigItemID<S>>(_id: ID, listener: Listener<Config<S>[ID]>): void;
};

export type Config<S extends Schema> = {
	[ID in ConfigItemID<S>]: Readonly<S[ID] & {
		[updatedAtKey]: number;
	}>
} & {
	
	addListener: AddListener<S>;
	on: AddListener<S>;
	
	removeListener: RemoveListener<S>;
	off: RemoveListener<S>;
	
	update<ID extends ConfigItemID<S>>(_id: ID, updates: Updates<Config<S>[ID]>): Promise<Config<S>[ID]>;
	
};
