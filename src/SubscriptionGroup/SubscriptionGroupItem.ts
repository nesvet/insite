import EventEmitter from "eventemitter3";
import { debounce, removeOne, StatefulPromise } from "@nesvet/n";
import {
	SubscriptionArrayWithSubscription,
	type Updated as SubscriptionArrayUpdated,
	type UpdateHandler as SubscriptionArrayUpdateHandler,
	type Updates as SubscriptionArrayUpdates
} from "../SubscriptionArray";
import {
	SubscriptionMapWithSubscription,
	type Updated as SubscriptionMapUpdated,
	type UpdateHandler as SubscriptionMapUpdateHandler,
	type Updates as SubscriptionMapUpdates
} from "../SubscriptionMap";
import {
	SubscriptionObjectWithSubscription,
	type Updated as SubscriptionObjectUpdated,
	type UpdateHandler as SubscriptionObjectUpdateHandler,
	type Updates as SubscriptionObjectUpdates
} from "../SubscriptionObject";
import {
	getAsInitialUpdatedSymbol,
	getAsUpdatesSymbol,
	getHandleUpdateSymbol,
	renewSymbol,
	setHandleUpdateSymbol,
	subscribeSymbol,
	unsubscribeSymbol
} from "../symbols";
import { privates } from "./common";
import type { SubscriptionGroup } from "./SubscriptionGroup";
import type {
	Definition,
	SubscriptionHandle,
	SubscriptionOnBeforeInit,
	SubscriptionType,
	SubscriptionUpdated,
	SubscriptionUpdates,
	SubscriptionValue
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


type HandleSubscription<T> = (_: any, updated: SubscriptionUpdated<T>, updates: SubscriptionUpdates<T>) => void;

function isUpdatedMapOrArray(updated: SubscriptionUpdated<SubscriptionType>): updated is SubscriptionArrayUpdated | SubscriptionMapUpdated {
	return Array.isArray(updated);
}


export class SubscriptionGroupItem<T extends SubscriptionType = SubscriptionType, D extends Definition<T> = Definition<T>> extends EventEmitter {
	constructor(definition: D, group: SubscriptionGroup) {
		super();
		
		this.name = definition.name;
		
		this.define(definition, group);
		
	}
	
	name;
	group?: SubscriptionGroup;
	value?: SubscriptionValue<T>;
	type!: T | "object";
	publicationName!: Definition<T>["publicationName"];
	params!: Definition<T>["params"];
	handle!: Definition<T>["handle"];
	onBeforeInit!: Definition<T>["onBeforeInit"];
	preventBind!: Definition<T>["preventBind"];
	
	emitUpdate!: (updated?: SubscriptionUpdated<T>) => void;
	
	isLoaded = false;
	isInited = false;
	
	#loadPromise!: StatefulPromise<SubscriptionGroupItem<T, D>>;
	#initPromise!: StatefulPromise<SubscriptionGroupItem<T, D>>;
	#unloadPromise!: StatefulPromise<SubscriptionGroupItem<T, D>>;
	
	define(definition: Definition<T>, group: SubscriptionGroup | undefined = this.group) {
		if (!group)
			throw new Error("group is undefined");
		
		const {
			value,
			type = "object",
			publicationName,
			params,
			handle,
			onBeforeInit,
			debounce: debounceLimit = SubscriptionGroupItem.debounceLimit,
			preventBind
		} = definition;
		
		if (this.group) {
			if (
				(!value || this.value === value) &&
				this.type === type &&
				this.publicationName === publicationName &&
				JSON.stringify(this.params) === JSON.stringify(params) &&
				this.handle === handle &&
				this.onBeforeInit === onBeforeInit
			)
				return this.#applyOptions({ debounceLimit, preventBind });
			
			this.detach();
			delete this.value;
			delete this.publicationName;
			delete this.params;
		}
		
		this.type = type;
		this.handle = handle;
		this.onBeforeInit = onBeforeInit;
		if (value)
			this.value = value;
		else {
			this.publicationName = publicationName ?? this.name;
			this.params = params ?? [];
		}
		
		this.#applyOptions({ debounceLimit, preventBind });
		
		this.#attachTo(group);
		
	}
	
	#applyOptions({ debounceLimit, preventBind }: { debounceLimit?: number; preventBind?: boolean }) {
		
		const emitUpdate: typeof this.emitUpdate = updated => {
			this.emit("update", this.value, updated);
			this.group?.emit(`update.${this.name}`, this.value, updated);
			this.group?.emitUpdate();
			
		};
		
		if (typeof debounceLimit == "number") {
			let debouncedUpdated: SubscriptionUpdated<T> | undefined;
			let group: SubscriptionGroup;
			
			const emitUpdateDebounced = debounce(() => {
				
				const isDetached = !this.group;
				
				if (isDetached)
					this.group = group;
				
				emitUpdate(debouncedUpdated);
				
				if (isDetached)
					delete this.group;
				
				debouncedUpdated = undefined;
				
			}, debounceLimit);
			
			this.emitUpdate = updated => {
				if (updated !== undefined)
					if (isUpdatedMapOrArray(updated))
						if (isUpdatedMapOrArray(debouncedUpdated!))
							for (const item of updated)
								debouncedUpdated.push(item);
						else
							debouncedUpdated = Object.assign([ ...updated ], {
								added: [ ...updated.added ],
								deleted: [ ...updated.deleted ]
							}) as SubscriptionUpdated<T>;
					else if (typeof updated == "object")
						if (debouncedUpdated)
							Object.assign(debouncedUpdated, updated);
						else
							debouncedUpdated = { ...updated };
					else
						debouncedUpdated = updated;
				
				group = this.group!;
				
				return emitUpdateDebounced();
			};
		} else
			this.emitUpdate = emitUpdate;
		
		if (this.preventBind === undefined)
			delete this.preventBind;
		else
			this.preventBind = preventBind;
		
	}
	
	#attachTo(group: SubscriptionGroup) {
		if (!this.group) {
			this.group = group;
			
			this.group.items.push(this as SubscriptionGroupItem<any>);
			this.group.items[this.name] = this as SubscriptionGroupItem<any>;
			
			if (!this.#loadPromise || this.#loadPromise.isFulfilled)
				this.#loadPromise = new StatefulPromise();
			
			if (!this.#initPromise || this.#initPromise.isFulfilled)
				this.#initPromise = new StatefulPromise();
			
			if (!this.#unloadPromise || this.#unloadPromise.isFulfilled)
				this.#unloadPromise = new StatefulPromise();
			
			switch (this.type) {
				case "array": {
					const handleSubscription = this.#handleSubscription as HandleSubscription<"array">;
					if (this.value)
						(this.value as SubscriptionArrayWithSubscription)[setHandleUpdateSymbol](handleSubscription);
					else
						this.value = new SubscriptionArrayWithSubscription(this.publicationName!, this.params!, handleSubscription, false) as SubscriptionValue<T>;
					break;
				} case "map": {
					const handleSubscription = this.#handleSubscription as HandleSubscription<"map">;
					if (this.value)
						(this.value as SubscriptionMapWithSubscription)[setHandleUpdateSymbol](handleSubscription);
					else
						this.value = new SubscriptionMapWithSubscription(this.publicationName!, this.params!, handleSubscription, false) as SubscriptionValue<T>;
					break;
				} default: {
					const handleSubscription = this.#handleSubscription as HandleSubscription<"object">;
					if (this.value)
						(this.value as SubscriptionObjectWithSubscription)[setHandleUpdateSymbol](handleSubscription);
					else
						this.value = new SubscriptionObjectWithSubscription(this.publicationName!, this.params!, handleSubscription, false) as SubscriptionValue<T>;
				}
			}
			
			this.group.values.push(this.value);
			this.group.values[this.name] = this.value;
			
			if (this.onBeforeInit)
				switch (this.type) {
					case "array":
						(this.onBeforeInit as SubscriptionOnBeforeInit<"array">).call(this.group, this.value as SubscriptionArrayWithSubscription);
						break;
					case "map":
						(this.onBeforeInit as SubscriptionOnBeforeInit<"map">).call(this.group, this.value as SubscriptionMapWithSubscription);
						break;
					default:
						(this.onBeforeInit as SubscriptionOnBeforeInit<"object">).call(this.group, this.value as SubscriptionObjectWithSubscription);
				}
		}
		
	}
	
	detach() {
		
		if (this.group) {
			this.value?.[unsubscribeSymbol]();
			
			this.isLoaded = false;
			this.#unload();
			
			delete this.group.values[this.name];// eslint-disable-line @typescript-eslint/no-array-delete
			removeOne(this.group.values, this.value);
			delete this.group.items[this.name];// eslint-disable-line @typescript-eslint/no-array-delete
			removeOne(this.group.items, this as SubscriptionGroupItem<any>);
			
			delete this.group;
		}
		
	}
	
	#loadUpdated: SubscriptionUpdated<T> | null = null;
	
	#handleSubscription: HandleSubscription<T> = (_, updated, updates) => {
		if (updates)
			if (this.group!.isLoaded) {
				if (this.handle)
					switch (this.type) {
						case "array":
							(this.handle as SubscriptionHandle<"array">).call(this.group!, updated as SubscriptionArrayUpdated, this.group!);
							break;
						case "map":
							(this.handle as SubscriptionHandle<"map">).call(this.group!, updated as SubscriptionMapUpdated, this.group!);
							break;
						default:
							(this.handle as SubscriptionHandle<"object">).call(this.group!, updated as SubscriptionObjectUpdated, this.group!);
					}
				this.emitUpdate(updated);
			} else {
				this.#loadUpdated = updated;
				this.isLoaded = true;
				privates.groupLoad!(this.group!);
			}
		else if (this.isLoaded) {
			this.isLoaded = false;
			privates.groupUnload!(this.group!);
		}
		
		if (!this.isInited) {
			this.isInited = true;
			privates.groupInit!(this.group!);
		}
		
	};
	
	#load() {
		
		if (this.#loadUpdated) {
			if (this.handle)
				switch (this.type) {
					case "array":
						(this.handle as SubscriptionHandle<"array">).call(this.group!, this.#loadUpdated as SubscriptionArrayUpdated, this.group!);
						break;
					case "map":
						(this.handle as SubscriptionHandle<"map">).call(this.group!, this.#loadUpdated as SubscriptionMapUpdated, this.group!);
						break;
					default:
						(this.handle as SubscriptionHandle<"object">).call(this.group!, this.#loadUpdated as SubscriptionObjectUpdated, this.group!);
				}
			
			this.#loadUpdated = null;
			
			this.emit("load", this.value);
			
			this.#loadPromise.resolve(this);
			
			if (this.#unloadPromise.isFulfilled)
				this.#unloadPromise = new StatefulPromise();
		}
		
	}
	
	#init() {
		
		this.emit("init", this.value);
		
		this.#initPromise.resolve(this);
		
	}
	
	#unload() {
		
		if (this.handle)
			switch (this.type) {
				case "array":
					(this.handle as SubscriptionHandle<"array">).call(this.group!, null, this.group!);
					break;
				case "map":
					(this.handle as SubscriptionHandle<"map">).call(this.group!, null, this.group!);
					break;
				default:
					(this.handle as SubscriptionHandle<"object">).call(this.group!, null, this.group!);
			}
		
		this.emit("unload", this.value);
		
		this.#unloadPromise.resolve(this);
		
		if (this.#loadPromise.isFulfilled)
			this.#loadPromise = new StatefulPromise();
		
	}
	
	loaded() {
		return this.#loadPromise;
	}
	
	inited() {
		return this.#initPromise;
	}
	
	unloaded() {
		return this.#unloadPromise;
	}
	
	subscribe() {
		
		if (this.value)
			if (this.value[subscribeSymbol])
				return this.value[subscribeSymbol]();
			else {
				const handleUpdate = this.value[getHandleUpdateSymbol]();
				
				if (handleUpdate) {
					const initialUpdated = this.value[getAsInitialUpdatedSymbol]();
					const updates = this.value[getAsUpdatesSymbol]();
					
					switch (this.type) {
						case "array":
							return (handleUpdate as SubscriptionArrayUpdateHandler)(this.value as SubscriptionArrayWithSubscription, initialUpdated as SubscriptionArrayUpdated, updates as SubscriptionArrayUpdates);
						
						case "map":
							return (handleUpdate as SubscriptionMapUpdateHandler)(this.value as SubscriptionMapWithSubscription, initialUpdated as SubscriptionMapUpdated, updates as SubscriptionMapUpdates);
						
						default:
							return (handleUpdate as SubscriptionObjectUpdateHandler)(this.value as SubscriptionObjectWithSubscription, initialUpdated as SubscriptionObjectUpdated, updates as SubscriptionObjectUpdates);
					}
				}
			}
		
	}
	
	unsubscribe() {
		return this.value?.[unsubscribeSymbol]?.();
	}
	
	renew(publicationName: Definition<T>["publicationName"], params: Definition<T>["params"]) {
		return this.value?.[renewSymbol]?.(publicationName, params);
	}
	
	valueOf() {
		return this.value;
	}
	
	
	static debounceLimit = 4;
	
	static {
		
		privates.itemLoad = <
			DP extends Definition<TP>,
			TP extends SubscriptionType
		>(item: SubscriptionGroupItem<TP, DP>) => item.#load();
		privates.itemInit = <
			DP extends Definition<TP>,
			TP extends SubscriptionType
		>(item: SubscriptionGroupItem<TP, DP>) => item.#init();
		privates.itemUnload = <
			DP extends Definition<TP>,
			TP extends SubscriptionType
		>(item: SubscriptionGroupItem<TP, DP>) => item.#unload();
		
	}
	
}
