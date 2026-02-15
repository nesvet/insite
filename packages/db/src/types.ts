import type { JSONSchema4 } from "json-schema";
import type {
	ChangeStreamDocument,
	Collection,
	CreateIndexesOptions,
	Db,
	Document,
	IndexSpecification,
	MongoClientOptions
} from "mongodb";
import type { Collections } from "./Collections";


export type DB = Db;

export type CollectionSchema = JSONSchema4;

export type Options = MongoClientOptions & {
	url: string;
	name: string;
	onConnect?: (collections: Collections, db: DB) => Promise<void>;
};

export type CollectionOptions = {
	fullDocument?: boolean;
	schema?: CollectionSchema;
	indexes?: CollectionIndexes;
	blockCompressor?: "none" | "snappy" | "zlib" | "zstd";
	watch?: boolean;
	quiet?: boolean;
};

export type CollectionIndexes = [ IndexSpecification, CreateIndexesOptions? ][];

export type ChangeStreamListener<TSchema extends Document> = (listener: ChangeStreamDocument<TSchema>) => void;

export type WatchedCollection<Doc extends Document = Document> =
	Collection<Doc> &
	Required<Pick<Collection<Doc>, "changeStream" | "onceChange" | "onChange" | "prependChange" | "prependOnceChange" | "removeChangeListener">>;
