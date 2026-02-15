import type { Binary, CollectionOptions } from "insite-db";


export type AvatarDoc = {
	_id: string;
	type: string;
	size: number;
	ts: string;
	data: Binary;
	meta: Record<string, unknown>;
};

export type AvatarsOptions = {
	collection?: Omit<CollectionOptions, "fullDocument" | "watch">;
};
