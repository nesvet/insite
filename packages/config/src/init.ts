import {
	isEmpty,
	pick,
	typeSafeObjectEntries,
	typeSafeObjectFromEntries
} from "@nesvet/n";
import type { Collections } from "insite-db";
import { updatedAtKey, updatedAtSymbol } from "./symbols";
import type {
	CollectionOptions,
	Config,
	ConfigItemID,
	Listener,
	Schema,
	Updates
} from "./types";


export class UnknownConfigItemError extends Error {
	constructor(_id: string) {
		super(`Unknown Config item "${_id}"`);
		
	}
	
	name = "UnknownConfigItemError";
	
}


let initedConfig: Config<Schema>;

export async function init<S extends Schema>(collections: Collections, schema: S, collectionOptions?: CollectionOptions) {
	
	if (!initedConfig) {
		type ID = ConfigItemID<S>;
		type CI = Config<S>[ID];
		
		const updateListeners = new Map<CI, Set<Listener<CI>>>();
		
		type CIDoc = CI & { _id: ID };
		const collection = await collections.ensure<CIDoc>("config", collectionOptions);
		
		const config: Config<S> = {
			
			addListener(_id, listener: Listener<CI>, immediately) {
				const item = this[_id];
				
				if (item) {
					if (immediately)
						void listener.call(item, item, { ...item });
					
					updateListeners.get(item)?.add(listener) ??
					updateListeners.set(item, new Set([ listener ]));
				} else
					throw new UnknownConfigItemError(_id);
			},
			
			removeListener(_id, listener: Listener<CI>) {
				const item = this[_id];
				
				if (item)
					updateListeners.get(item)?.delete(listener);
				else
					throw new UnknownConfigItemError(_id);
			},
			
			async update(_id, { [updatedAtSymbol]: updatedAt, ...updates }) {
				const item = this[_id] as CI;
				
				if (updatedAtKey in updates)
					delete updates[updatedAtKey];
				
				if (item) {
					if (!isEmpty(updates) && (!updatedAt || item[updatedAtKey] < updatedAt)) {
						const updatedFields: Partial<CI> = {};
						
						for (const [ key, value ] of Object.entries(updates) as [ keyof CI, CI[keyof CI] ][])
							if (key in item && item[key] !== value)
								updatedFields[key] = value;
						
						if (!isEmpty(updatedFields)) {
							if (!updatedAt) {
								Object.assign(updatedFields, { [updatedAtKey]: Date.now() });
								void collection.updateOne({ _id }, { $set: updatedFields as Partial<CIDoc> });
							}
							
							const prevFields = pick(item, Object.keys(updatedFields)) as Partial<CI>;
							
							Object.assign(item, updatedFields);
							
							for (const listener of updateListeners.get(item) ?? [])
								await listener.call(item, updatedFields, prevFields);
						}
					}
					
					return item;
				}
				
				throw new UnknownConfigItemError(_id);
			}
			
		} as Config<S>;
		
		config.on = config.addListener;
		config.off = config.removeListener;
		
		initedConfig = config;// eslint-disable-line require-atomic-updates
		
		
		const collectionMap = new Map((await collection.find().toArray()).map(({ _id, ...props }) => [ _id as ID, props as CI ]));
		
		const itemsMap = new Map<ID, CI>();
		
		const initialUpdatedAt = Date.now();
		
		for (const [ _id, props ] of Object.entries(schema) as [ID, S[keyof S]][]) {
			const collectionItem = collectionMap.get(_id);
			
			const item = {
				...typeSafeObjectFromEntries(
					typeSafeObjectEntries(props).map(([ key, value ]) =>
						[ key, collectionItem?.[key] ?? value ]
					)
				),
				[updatedAtKey]: collectionItem?.[updatedAtKey] ?? initialUpdatedAt
			} as CI;
			
			config[_id] = item;
			
			itemsMap.set(_id, item);
		}
		
		
		await collection.bulkWrite([
			...[ ...itemsMap ].map(([ _id, item ]) => ({ replaceOne: { filter: { _id }, replacement: { _id, ...item }, upsert: true } })),
			...[ ...collectionMap.keys() ].filter(_id => !schema[_id]).map(_id => ({ deleteOne: { filter: { _id } } }))
		]);
		
		collection.onChange(next => {
			switch (next.operationType) {
				case "update":
				case "replace": {
					const {
						_id: _,
						[updatedAtKey]: updatedAt = Date.now(),
						...restProps
					} = next.operationType === "replace" ? next.fullDocument : next.updateDescription.updatedFields!;
					
					void config.update(next.documentKey._id as unknown as ID, {
						...restProps,
						[updatedAtSymbol]: updatedAt
					} as Updates<CI>);
				}
			}
			
		});
		
	}
	
	return initedConfig as Config<S>;
}
