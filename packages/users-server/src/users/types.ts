import type { Prettify } from "@nesvet/n";
import type { CollectionIndexes, CollectionOptions, CollectionSchema } from "insite-db";
import type { OrgsOptions } from "../orgs/types";
import type { RolesOptions } from "../roles/types";
import type { SessionsOptions } from "../sessions/types";
import type { AvatarsOptions } from "./avatars";


export type UserDoc = {
	_id: string;
	email: string;
	password: string;
	roles: string[];
	name: {
		first?: string;
		middle?: string;
		last?: string;
	};
	org: string | null;
	job: string;
	avatar?: string | null;
	meta: Record<string, unknown>;
	createdAt: number;
};

export type Options<AS> = {
	abilities: AS;
	indexes?: CollectionIndexes;
	schema?: CollectionSchema;
	initialRoot?: Partial<UserDoc>;
	roles?: RolesOptions;
	orgs?: OrgsOptions;
	sessions?: SessionsOptions;
	avatars?: AvatarsOptions;
	collection?: Omit<CollectionOptions, "fullDocument" | "watch">;
};

export type NewUser = Prettify<
	Omit<UserDoc, "_id" | "createdAt" | "job" | "meta" | "name" | "org"> &
	Partial<Pick<UserDoc, "job" | "meta" | "org">> &
	{ name: Partial<UserDoc["name"]> }
>;
