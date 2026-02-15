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


const handleUpdateSymbol = Symbol("handleUpdate");
const updatesSymbol = Symbol("updates");

export type Updated = Record<string, unknown>;
export type Updates = Record<string, unknown> | null;
export type UpdateHandler = (object: SubscriptionObject, updated: Updated, updates: Updates) => void;


export class SubscriptionObject {
	constructor(updates?: Updates, onUpdate?: UpdateHandler) {
		if (onUpdate)
			this[handleUpdateSymbol] = onUpdate;
		
		if (updates)
			this[updateSymbol](updates);
		
	}
	
	[handleUpdateSymbol]?: UpdateHandler;
	
	[updatesSymbol]: Updates = null;
	
	[getHandleUpdateSymbol]() {
		return this[handleUpdateSymbol];
	}
	
	[setHandleUpdateSymbol](handleUpdate: UpdateHandler) {
		return (this[handleUpdateSymbol] = handleUpdate);
	}
	
	[updateSymbol](updates: Updates) {
		if (updates) {
			for (const key in this[updatesSymbol])// eslint-disable-line guard-for-in
				delete this[key];
			for (const key in updates)// eslint-disable-line guard-for-in
				this[key] = updates[key];
			this[updatesSymbol] = updates;
		} else
			this[clearSymbol]();
		
		this[handleUpdateSymbol]?.(this, this, this[updatesSymbol]);
		
		return this;
	}
	
	[getAsUpdatesSymbol](): Updates {
		return this[updatesSymbol] && { ...this[updatesSymbol] };
	}
	
	[getAsInitialUpdatedSymbol](): Updated {
		return this.valueOf()!;
	}
	
	[clearSymbol]() {
		
		for (const key in this)// eslint-disable-line guard-for-in
			delete this[key];
		this[updatesSymbol] = null;
		
	}
	
	valueOf() {
		return this[updatesSymbol] && this;
	}
	
	get [Symbol.toStringTag]() {
		return "SubscriptionObject";
	}
	
	[key: string]: unknown;
	
	
	static updateSymbol = updateSymbol;
	static getHandleUpdateSymbol = getHandleUpdateSymbol;
	static setHandleUpdateSymbol = setHandleUpdateSymbol;
	static getAsUpdatesSymbol = getAsUpdatesSymbol;
	static getAsInitialUpdatedSymbol = getAsInitialUpdatedSymbol;
	static clearSymbol = clearSymbol;
	static WithSubscription: typeof SubscriptionObjectWithSubscription;
	
}


export class SubscriptionObjectWithSubscription extends SubscriptionObject {
	constructor(publicationName: string, params: unknown[], onUpdate: UpdateHandler, immediately = true) {
		super(null, onUpdate);
		
		this.#publicationName = publicationName;
		this.#params = params;
		
		if (immediately)
			this[subscribeSymbol]();
		
	}
	
	#publicationName;
	#params;
	#subscription: Subscription | null = null;
	
	[subscribeSymbol]() {
		
		if (!this.#subscription)
			this.#subscription = new Subscription("object", this.#publicationName, this.#params, updates => this[updateSymbol](updates as Updates));
		
	}
	
	[unsubscribeSymbol]() {
		
		if (this.#subscription) {
			this.#subscription.cancel();
			this.#subscription = null;
		}
		
	}
	
	[renewSymbol](publicationName?: string, params?: unknown[]) {
		
		if (this.#subscription) {
			this[unsubscribeSymbol]();
			
			if (publicationName)
				if (Array.isArray(publicationName))
					params = publicationName;
				else
					this.#publicationName = publicationName;
			
			if (params)
				this.#params = params;
			
			this[subscribeSymbol]();
		}
		
	}
	
	[getSubscriptionSymbol]() {
		return this.#subscription;
	}
	
	get [Symbol.toStringTag]() {
		return "SubscriptionObjectWithSubscription";
	}
	
	
	static subscribeSymbol = subscribeSymbol;
	static unsubscribeSymbol = unsubscribeSymbol;
	static renewSymbol = renewSymbol;
	static getSubscriptionSymbol = getSubscriptionSymbol;
	
}

SubscriptionObject.WithSubscription = SubscriptionObjectWithSubscription;
