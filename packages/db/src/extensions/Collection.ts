import { isDeepStrictEqual } from "node:util";
import { Collection, type ChangeStream } from "mongodb";
import { omit } from "@nesvet/n";
import type { ChangeStreamListener, CollectionIndexes, WatchedCollection } from "../types";


const ACTUAL_INDEX_VERSION = 2;


declare module "mongodb" {
	export interface Collection<TSchema> { // eslint-disable-line no-shadow
		
		/** Ensures the presence of `indexes`. */
		ensureIndexes(indexes: CollectionIndexes): Promise<void>;
		
		/** Change Stream, watching for new changes in this collection. */
		changeStream?: ChangeStream<TSchema>;
		
		/** Adds the `listener` function to the end of the listeners array for the event `change`. */
		onChange?(listener: ChangeStreamListener<TSchema>): this;
		
		/** Adds the `listener` function to the *beginning* of the listeners array for the event `change`. */
		prependChange?(listener: ChangeStreamListener<TSchema>): this;
		
		/** Adds the **one-time** `listener` function to the end of the listeners array for the event `change`. */
		onceChange?(listener: ChangeStreamListener<TSchema>): this;
		
		/** Adds the **one-time** function to the *beginning* of the listeners array for the event `change`. */
		prependOnceChange?(listener: ChangeStreamListener<TSchema>): this;
		
		/** Removes the `listener` from the listener array for the event `change`. */
		removeChangeListener?(listener: ChangeStreamListener<TSchema>): this;
		
	}
}


Collection.prototype.ensureIndexes = async function (indexes, dropOther = false) {
	if (dropOther) {
		const existingIndexes = await this.indexes();
		
		for (let i = 0; i < indexes.length; i++) {
			const [ specification, options = {} ] = indexes[i];
			
			for (let j = 0; j < existingIndexes.length; j++) {
				const existingIndex = existingIndexes[j];
				
				if (
					isDeepStrictEqual(specification, existingIndex.key) &&
					isDeepStrictEqual(options, omit(existingIndex, [ "v", "key", "name" ]))
				) {
					indexes.splice(i--, 1);
					existingIndexes.splice(j, 1);
					break;
				}
			}
		}
		
		await Promise.all([
			...indexes.map(index => this.createIndex(...index)),
			...existingIndexes.filter(({ name, v }) => name && name !== "_id_" && (!v || v <= ACTUAL_INDEX_VERSION)).map(({ name }) => this.dropIndex(name!))
		]);
	} else
		await Promise.all(indexes.map(index => this.createIndex(...index)));
	
};

Collection.prototype.onChange = function (this: WatchedCollection, listener) {
	this.changeStream.on("change", listener);
	
	return this;
};

Collection.prototype.prependChange = function (this: WatchedCollection, listener) {
	this.changeStream.prependListener("change", listener);
	
	return this;
};

Collection.prototype.onceChange = function (this: WatchedCollection, listener) {
	this.changeStream.once("change", listener);
	
	return this;
};

Collection.prototype.prependOnceChange = function (this: WatchedCollection, listener) {
	this.changeStream.prependOnceListener("change", listener);
	
	return this;
};

Collection.prototype.removeChangeListener = function (this: WatchedCollection, listener) {
	this.changeStream.removeListener("change", listener);
	
	return this;
};
