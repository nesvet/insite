import type { CollectionIndexes, CollectionOptions, CollectionSchema } from "insite-db";


export type SessionDoc = {
	_id: string;
	user: string;
	userAgent: string;
	remoteAddress: string;
	isOnline: boolean;
	meta: Record<string, unknown>;
	createdAt: number;
	prolongedAt: number;
	expiresAt: Date;
	
	// TODO: Remove in favor of meta
	[customProp: string]: unknown;
};

export type SessionsOptions = {
	schema?: CollectionSchema;
	indexes?: CollectionIndexes;
	collection?: Omit<CollectionOptions, "fullDocument" | "watch">;
};
