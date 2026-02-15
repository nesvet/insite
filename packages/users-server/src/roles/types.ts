import type { Prettify } from "@nesvet/n";
import type { CollectionIndexes, CollectionOptions, CollectionSchema } from "insite-db";
import type { GenericAbilities } from "../abilities";


export type RoleDoc = {
	_id: Exclude<string, "root">;
	involves: Exclude<string, "root">[];
	abilities: GenericAbilities;
	title: string;
	description: string;
	meta: Record<string, unknown>;
	createdAt: number;
};

export type RolesOptions = {
	schema?: CollectionSchema;
	indexes?: CollectionIndexes;
	root?: Partial<RoleDoc>;
	collection?: Omit<CollectionOptions, "fullDocument" | "watch">;
};

export type NewRole = Prettify<
	Omit<RoleDoc, "abilities" | "createdAt" | "description" | "involves" | "meta" | "title"> &
	Partial<Pick<RoleDoc, "description" | "involves" | "meta" | "title">>
>;
