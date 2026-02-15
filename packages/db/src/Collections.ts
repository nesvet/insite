import type { Collection, Document } from "mongodb";
import { captureStackTrace } from "@nesvet/n";
import { printChangeStreamChangeDetails, printChangeStreamError } from "./utils";
import type { CollectionOptions, DB, WatchedCollection } from "./types";


export class Collections extends Map<string, Collection> {
	constructor(db: DB) {
		super();
		
		this.db = db;
		
	}
	
	db: DB;
	
	#awaiting = new Map<string, Promise<Collection>>();
	
	#schemaSet = new Map<string, string>();
	#indexesSet = new Map<string, string>();
	
	[key: string]: unknown;
	
	async ensure<Doc extends Document>(name: string, options: CollectionOptions & { watch: false }): Promise<Collection<Doc>>;
	async ensure<Doc extends Document>(name: string, options?: CollectionOptions): Promise<WatchedCollection<Doc>>;
	async ensure(name: string, options: CollectionOptions = {}) {
		
		const { db } = this;
		
		let collection = this.get(name) ?? await this.#awaiting.get(name);
		
		if (!collection) {
			const { promise, resolve } = Promise.withResolvers<Collection>();
			this.#awaiting.set(name, promise);
			
			try {
				if ((await db.listCollections({ name }, { nameOnly: true }).toArray()).length)
					collection = db.collection(name);
				else {
					collection = await db.createCollection(name, {
						...options.schema && { validator: { $jsonSchema: options.schema } },
						...options.blockCompressor && { storageEngine: { wiredTiger: { configString: `block_compressor=${options.blockCompressor}` } } }
					});
					
					delete options.schema;
					delete options.blockCompressor;
				}
				
				if (options.watch !== false) {
					const changeStream = collection.watch(undefined, { fullDocument: options.fullDocument === false ? undefined : "updateLookup" });
					
					if (process.env.NODE_ENV === "development" ? options.quiet !== true : !options.quiet)
						changeStream.on("change", printChangeStreamChangeDetails);
					
					changeStream.on("error", printChangeStreamError);
					
					collection.changeStream = changeStream;
				}
				
				this.set(name, collection);
				this[name] = collection;
				
				resolve(collection);
			} finally {
				this.#awaiting.delete(name);
			}
		}
		
		if (options.schema)
			if (this.#schemaSet.has(name))
				console.warn(
					`🌿⚠️  Attempt to set schema for the \x1B[1m${name}\x1B[22m collection at\n` +
					`${captureStackTrace()}\n` +
					"\n" +
					"    Which has already been set at\n" +
					`${this.#schemaSet.get(name)}\n` +
					"\n" +
					"    Skipping"
				);
			else {
				this.#schemaSet.set(name, captureStackTrace());
				
				await db.command({ collMod: name, validator: { $jsonSchema: options.schema } });
			}
		
		if (options.indexes)
			if (this.#indexesSet.has(name))
				console.warn(
					`🌿⚠️  Attempt to set indexes for the \x1B[1m${name}\x1B[22m collection at\n` +
					`${captureStackTrace()}\n` +
					"\n" +
					"    Which have already been set at\n" +
					`${this.#indexesSet.get(name)}\n` +
					"\n" +
					"    Skipping"
				);
			else {
				this.#indexesSet.set(name, captureStackTrace());
				
				await collection.ensureIndexes(options.indexes);
			}
		
		return collection;
	}
	
}
