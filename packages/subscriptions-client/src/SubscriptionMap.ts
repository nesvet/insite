import { removeOne, unique } from "@nesvet/n";
import { Subscription } from "./Subscription";
import {
	clearSymbol,
	getAsInitialUpdatedSymbol,
	getAsUpdatesSymbol,
	getHandleUpdateSymbol,
	getSubscriptionSymbol,
	renewSymbol,
	setHandleUpdateSymbol,
	subscribeSymbol,
	unsubscribeSymbol,
	updateSymbol
} from "./symbols";


type GenericItem = Record<string, any> & { _id: string };// eslint-disable-line @typescript-eslint/no-explicit-any

type Item = GenericItem | SubscriptionMapItem;

export type Updated<I extends Item = Item> = I[] & {
	deleted: string[];
	added: I[];
};

type SortList = Record<string, -1 | 1>;

export type Updates<I extends Item = Item> =
	(
		[ "c"/* create */, item: I ] |
		[ "d"/* delete */, _id: string ] |
		[ "i"/* initial */, items: I[], sortList?: SortList | null ] |
		[ "u"/* update */, itemUpdates: Partial<I> & { _id: string }, isAtomicOrUpdatedFields: string[] | true ] |
		null
	)[] |
	null;

export type UpdateHandler<I extends Item = Item> = (map: SubscriptionMap<I>, updated: Updated<I>, updates: Updates<I>) => void;

declare global {
	var __insite_subscription_map_sort_function: ((a: Item, b: Item) => -1 | 0 | 1) | undefined;// eslint-disable-line camelcase, @typescript-eslint/naming-convention
}

function createSortFunction(sortList: SortList) {
	
	const tempScript = document.createElement("script");
	
	tempScript.textContent = `window.__insite_subscription_map_sort_function = function sort(a, b) { return ${
		Object.entries(sortList)
			.map(([ key, value ]) => {
				if (key.includes("."))
					key = key.replaceAll(".", "?.");
				
				return value > 0 ? `a.${key} > b.${key} ? 1 : a.${key} < b.${key} ? -1 :` : `a.${key} < b.${key} ? 1 : a.${key} > b.${key} ? -1 :`;
			})
			.concat("0")
			.join(" ")
	};}`;
	
	document.head.append(tempScript);
	
	const sortFunction = globalThis.__insite_subscription_map_sort_function!;
	
	tempScript.remove();
	delete globalThis.__insite_subscription_map_sort_function;
	
	return sortFunction;
}

// function createSortFunction(sortList: SortList) {
//     return new Function(// eslint-disable-line no-new-func
// 		"a"/* Item */,
// 		"b"/* Item */,
// 		`return ${
// 			Object.entries(sortList)
// 				.map(([ key, value ]) => value > 0 ? `a.${key} > b.${key} ? 1 : a.${key} < b.${key} ? -1 :` : `a.${key} < b.${key} ? 1 : a.${key} > b.${key} ? -1 :`)
// 				.concat("0")
// 				.join(" ")
// 		}`
// 	) as (a: Item, b: Item) => -1 | 0 | 1;
// }


export class SubscriptionMap<I extends Item = Item> extends Map<string, I> {
	constructor(updates?: Updates<I>, onUpdate?: UpdateHandler<I>) {
		super();
		
		if (onUpdate)
			this.handleUpdate = onUpdate;
		
		if (updates)
			this.update(updates);
		
	}
	
	handleUpdate;
	
	#updates = new Map<string, I>();
	
	sortList: SortList | null = null;
	
	sortCompareFunction: ((a: I, b: I) => number) | null = null;
	
	#fieldsToSort: string[] = [];
	
	sorted: I[] = [];
	
	sort() {
		
		if (this.sortCompareFunction)
			this.sorted.sort(this.sortCompareFunction);
		
	}
	
	[getHandleUpdateSymbol]() {
		return this.handleUpdate;
	}
	
	[setHandleUpdateSymbol](handleUpdate: UpdateHandler<I>) {
		return (this.handleUpdate = handleUpdate);
	}
	
	#Item!: { new (map: SubscriptionMap<I>, updates: GenericItem): I };
	
	set Item(TheItem: { new (map: SubscriptionMap<I>, updates: GenericItem): I }) { // eslint-disable-line @typescript-eslint/naming-convention
		this.#Item = TheItem;
		
		if (this.size)
			for (const [ _id, item ] of this)
				this.set(_id, new TheItem(this, item));
		
	}
	
	get Item() {
		return this.#Item;
	}
	
	update(updates: Updates<I>) {
		
		const updated: Updated<I> = Object.assign([], {
			added: [],
			deleted: []
		});
		
		if (updates) {
			let shouldSort = false;
			
			const TheItem = this.#Item;// eslint-disable-line @typescript-eslint/naming-convention
			const prevUpdates = this.#updates;
			
			for (const update of updates)
				switch (update?.[0]) {
					case "i"/* initial */: {
						const [ , array, sortList ] = update;
						
						if (sortList) {
							this.sortList = sortList;
							this.sortCompareFunction = createSortFunction(sortList);
							this.#fieldsToSort = unique(Object.keys(sortList).map(key => key.replace(/\..+/, "")));
							shouldSort = true;
						} else {
							this.sortList = null;
							this.sortCompareFunction = null;
							this.#fieldsToSort = [];
						}
						
						if (this.size) {
							const updatesMap = new Map<string, I>();
							for (const itemUpdates of array)
								updatesMap.set(itemUpdates._id, itemUpdates);
							
							for (const [ _id, item ] of this) {
								const itemUpdates = updatesMap.get(_id);
								if (itemUpdates) {
									const prevItemUpdates = prevUpdates.get(_id);
									
									if (TheItem)
										item.update(itemUpdates);
									else {
										for (const key in prevItemUpdates)// eslint-disable-line guard-for-in
											delete item[key as keyof typeof item];
										
										Object.assign(item, itemUpdates);
									}
									
									prevUpdates.set(_id, itemUpdates);
									updated.push(item);
									updatesMap.delete(_id);
								} else {
									if (TheItem)
										item.delete();
									else
										this.delete(_id);
									prevUpdates.delete(_id);
									updated.deleted.push(_id);
								}
							}
							
							for (const [ _id, itemUpdates ] of updatesMap) {
								const item = TheItem ? new TheItem(this, itemUpdates) : { ...itemUpdates };
								this.set(_id, item);
								prevUpdates.set(_id, itemUpdates);
								updated.push(item);
								updated.added.push(item);
							}
							
							if (this.sortList)
								this.sorted = array.map(newItem => this.get(newItem._id)!);
							
						} else
							for (const itemUpdates of array) {
								const item = (TheItem ? new TheItem(this, itemUpdates) : { ...itemUpdates });
								this.set(item._id, item);
								this.sorted.push(item);
								prevUpdates.set(item._id, itemUpdates);
								updated.push(item);
								updated.added.push(item);
							}
						
						break;
					}
					
					case "c"/* create */:
					case "u"/* update */: {
						let [ , itemUpdates ] = update;
						let item = this.get(itemUpdates._id);
						
						if (item) {
							const isAtomic = update[2] === true;
							const updatedFields = isAtomic ? Object.keys(itemUpdates) : update[2] as string[];
							const prevItemUpdates = prevUpdates.get(item._id)!;
							
							if (TheItem)
								item.update(itemUpdates);
							else {
								if (!isAtomic)
									for (const key in prevItemUpdates)// eslint-disable-line guard-for-in
										delete item[key as keyof typeof item];
								
								Object.assign(item, itemUpdates);
							}
							
							if (isAtomic)
								itemUpdates = Object.assign(prevItemUpdates, itemUpdates);
							
							if (this.sortList && !shouldSort && (!updatedFields || updatedFields.some(fieldName => this.#fieldsToSort.includes(fieldName))))
								shouldSort = true;
						} else {
							item = (TheItem ? new TheItem(this, itemUpdates) : { ...itemUpdates }) as I;
							this.set(item._id, item);
							this.sorted.push(item);
							if (this.sortList)
								shouldSort = true;
							updated.added.push(item);
						}
						
						prevUpdates.set(item._id, itemUpdates as I);
						updated.push(item);
						
						break;
					}
					
					case "d"/* delete */: {
						const [ , _id ] = update;
						const itemToDelete = this.get(_id);
						
						if (itemToDelete) {
							if (TheItem)
								itemToDelete.delete();
							else
								this.delete(_id);
							prevUpdates.delete(_id);
							removeOne(this.sorted, itemToDelete);
							updated.deleted.push(_id);
						}
						
						break;
					}
					
					default:
						this.clear();
				}
			
			if (shouldSort)
				this.sort();
			
		} else
			this.clear();
		
		this.handleUpdate?.(this, updated, updates?.[0] ? updates : null);
		
		return this;
	}
	
	[updateSymbol] = this.update;
	
	getAsUpdates(): Updates<I> {
		return (
			(this.size || this.sortList) ?
				[ [ "i"/* initial */, [ ...this.#updates.values() ], this.sortList ] ] :
				null
		);
	}
	
	[getAsUpdatesSymbol] = this.getAsUpdates;
	
	getAsInitialUpdated(): Updated<I> {
		return Object.assign([ ...this.sorted ], {
			added: [ ...this.sorted ],
			deleted: []
		});
	}
	
	[getAsInitialUpdatedSymbol] = this.getAsInitialUpdated;
	
	clear() {
		
		super.clear();
		this.#updates.clear();
		this.sorted = [];
		this.sortList = null;
		this.sortCompareFunction = null;
		this.#fieldsToSort = [];
		
	}
	
	[clearSymbol] = this.clear;
	
	valueOf() {
		return this.sorted;
	}
	
	get [Symbol.toStringTag]() {
		return "SubscriptionMap";
	}
	
	
	static updateSymbol = updateSymbol;
	static getHandleUpdateSymbol = getHandleUpdateSymbol;
	static setHandleUpdateSymbol = setHandleUpdateSymbol;
	static getAsUpdatesSymbol = getAsUpdatesSymbol;
	static getAsInitialUpdatedSymbol = getAsInitialUpdatedSymbol;
	static clearSymbol = clearSymbol;
	static WithSubscription: typeof SubscriptionMapWithSubscription;
	static Item: typeof SubscriptionMapItem;
	
}


export class SubscriptionMapWithSubscription<I extends Item = Item> extends SubscriptionMap<I> {
	constructor(publicationName: string, params: unknown[], onUpdate: UpdateHandler<I>, immediately = true) {
		super(null, onUpdate);
		
		this.publicationName = publicationName;
		this.params = params;
		
		if (immediately)
			this.subscribe();
		
	}
	
	publicationName;
	params;
	
	subscription: Subscription | null = null;
	
	subscribe() {
		
		if (!this.subscription)
			this.subscription = new Subscription("map", this.publicationName, this.params, updates => this.update(updates as Updates<I>));
		
	}
	
	get [subscribeSymbol]() {
		return this.subscribe;
	}
	
	unsubscribe() {
		
		if (this.subscription) {
			this.subscription.cancel();
			this.subscription = null;
		}
		
	}
	
	get [unsubscribeSymbol]() {
		return this.unsubscribe;
	}
	
	renew(publicationName?: string, params?: unknown[]) {
		
		if (this.subscription) {
			this.unsubscribe();
			
			if (publicationName)
				if (Array.isArray(publicationName))
					params = publicationName;
				else
					this.publicationName = publicationName;
			
			if (params)
				this.params = params;
			
			this.subscribe();
		}
		
	}
	
	get [renewSymbol]() {
		return this.renew;
	}
	
	[getSubscriptionSymbol]() {
		return this.subscription;
	}
	
	get [Symbol.toStringTag]() {
		return "SubscriptionMapWithSubscription";
	}
	
	
	static subscribeSymbol = subscribeSymbol;
	static unsubscribeSymbol = unsubscribeSymbol;
	static renewSymbol = renewSymbol;
	static getSubscriptionSymbol = getSubscriptionSymbol;
	
}

SubscriptionMap.WithSubscription = SubscriptionMapWithSubscription;


export class SubscriptionMapItem {
	constructor(map: SubscriptionMap, updates: GenericItem) {
		this.#map = map;
		
		this.update(updates);
		
	}
	
	_id!: string;
	
	#map;
	
	update(updates: GenericItem) {
		Object.assign(this, updates);
		
	}
	
	delete() {
		
		this.#map.delete(this._id);
		
	}
	
}

SubscriptionMap.Item = SubscriptionMapItem;
