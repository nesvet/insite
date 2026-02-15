import { removeOne } from "@nesvet/n";
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


/* eslint-disable @typescript-eslint/no-explicit-any */


type Item = unknown;

export type Updated<I extends Item = Item> = I[] & {
	deleted: I[];
	added: I[];
};

export type Updates<I extends Item = Item> =
	(
		[ "a"/* add */, newItem: I ] |
		[ "d"/* delete */, itemToDelete: I ] |
		[ "i"/* initial */, items: I[], sort?: -1 | 0 | 1 ] |
		null
	)[] |
	null;

export type UpdateHandler<I extends Item = Item> = (array: SubscriptionArray<I>, updated: Updated<I>, updates: Updates<I>) => void;

const ascSort = (a: any, b: any) => a > b ? 1 : a < b ? -1 : 0;
const descSort = (a: any, b: any) => a > b ? -1 : a < b ? 1 : 0;


export class SubscriptionArray<I extends Item = Item> extends Array<I> {
	constructor(updates?: Updates<I>, onUpdate?: UpdateHandler<I>) {
		super();
		
		if (onUpdate)
			this.handleUpdate = onUpdate;
		
		if (Array.isArray(updates))
			this.update(updates);
		
	}
	
	sorted: I[] = [];
	
	handleUpdate;
	
	sortDirection: -1 | 0 | 1 = 0;
	
	sortCompareFunction: typeof ascSort | typeof descSort | null = null;
	
	[getHandleUpdateSymbol]() {
		return this.handleUpdate;
	}
	
	[setHandleUpdateSymbol](handleUpdate: UpdateHandler<I>) {
		return (this.handleUpdate = handleUpdate);
	}
	
	update(updates: Updates<I>) {
		
		const updated: Updated<I> = Object.assign([], {
			deleted: [],
			added: []
		});
		
		if (updates) {
			let shouldSort = false;
			
			for (const update of updates)
				switch (update?.[0]) {
					case "i"/* initial */: {
						const [ , array, sort ] = update;
						
						if (sort) {
							this.sortDirection = sort;
							this.sortCompareFunction = sort > 0 ? ascSort : descSort;
							shouldSort = true;
						} else {
							this.sortDirection = 0;
							this.sortCompareFunction = null;
						}
						
						this.length = 0;
						
						for (const newItem of array) {
							this.push(newItem);
							updated.push(newItem);
							updated.added.push(newItem);
						}
						
						break;
					}
					
					case "a"/* add */: {
						const [ , newItem ] = update;
						
						if (!this.includes(newItem)) {
							this.push(newItem);
							if (this.sortDirection)
								shouldSort = true;
							updated.push(newItem);
							updated.added.push(newItem);
						}
						
						break;
					}
					
					case "d"/* delete */: {
						const [ , itemToDelete ] = update;
						
						if (removeOne(this, itemToDelete))
							updated.deleted.push(itemToDelete);
						
						break;
					}
					
					default:
						this.clear();
				}
			
			if (shouldSort && this.sortCompareFunction)
				this.sort(this.sortCompareFunction);
			
		} else
			this.clear();
		
		this.handleUpdate?.(this, updated, updates?.[0] ? updates : null);
		
		return this;
	}
	
	[updateSymbol] = this.update;
	
	getAsUpdates(): Updates<I> {
		return (
			(this.length || this.sortDirection) ?
				[ [ "i"/* initial */, [ ...this ], this.sortDirection ] ] :
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
		
		this.length = 0;
		this.sortDirection = 0;
		this.sortCompareFunction = null;
		
	}
	
	[clearSymbol] = this.clear;
	
	valueOf() {
		return this;
	}
	
	get [Symbol.toStringTag]() {
		return "SubscriptionArray";
	}
	
	
	static updateSymbol = updateSymbol;
	static getHandleUpdateSymbol = getHandleUpdateSymbol;
	static setHandleUpdateSymbol = setHandleUpdateSymbol;
	static getAsUpdatesSymbol = getAsUpdatesSymbol;
	static getAsInitialUpdatedSymbol = getAsInitialUpdatedSymbol;
	static clearSymbol = clearSymbol;
	static WithSubscription: typeof SubscriptionArrayWithSubscription;
	
}


export class SubscriptionArrayWithSubscription<I extends Item = Item> extends SubscriptionArray<I> {
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
			this.subscription = new Subscription("array", this.publicationName, this.params, updates => this.update(updates as Updates<I>));
		
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
		return "SubscriptionArrayWithSubscription";
	}
	
	
	static subscribeSymbol = subscribeSymbol;
	static unsubscribeSymbol = unsubscribeSymbol;
	static renewSymbol = renewSymbol;
	static getSubscriptionSymbol = getSubscriptionSymbol;
	
}

SubscriptionArray.WithSubscription = SubscriptionArrayWithSubscription;
