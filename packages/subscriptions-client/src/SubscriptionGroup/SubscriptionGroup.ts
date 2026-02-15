import EventEmitter from "eventemitter3";
import { debounce, StatefulPromise } from "@nesvet/n";
import { privates } from "./common";
import { SubscriptionGroupItem } from "./SubscriptionGroupItem";
import {
	Definition,
	ParseValues,
	SubscriptionHandle,
	SubscriptionOnBeforeInit,
	SubscriptionType,
	TupleDefinition,
	UnparsedDefinition
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


function isTupleDefinition<T extends SubscriptionType>(definition: UnparsedDefinition<T>): definition is TupleDefinition {
	return Array.isArray(definition);
}

type Target = any;

type Options = {
	target?: Target;
	debounce?: number;
	immediately?: boolean;
};


function parseDefinition<T extends SubscriptionType>(definition: UnparsedDefinition<T>) {
	if (isTupleDefinition(definition)) {
		const args = definition.slice();
		
		const parsed: Partial<Definition<T>> = {};
		
		parsed.name = args.shift() as Definition<T>["name"];
		if (typeof args[0] == "object" && !Array.isArray(args[0])) {
			parsed.value = args.shift() as Definition<T>["value"];
			parsed.type = parsed.value!.toString().match(/Subscription(Object|Array|Map)/)?.[1].toLowerCase() as Definition<T>["type"];
			if (!parsed.type)
				throw new Error("Unknown value type");
		} else {
			if (typeof args[0] == "string")
				parsed.type = args.shift() as Definition<T>["type"];
			if (typeof args[0] == "string")
				parsed.publicationName = args.shift() as Definition<T>["publicationName"];
			if (Array.isArray(args[0]))
				parsed.params = args.shift() as Definition<T>["params"];
		}
		
		if (typeof args[0] == "function")
			parsed.handle = args.shift() as SubscriptionHandle<T>;
		if (typeof args[0] == "function")
			parsed.onBeforeInit = args.shift() as SubscriptionOnBeforeInit<T>;
		if (typeof args[0] == "number")
			parsed.debounce = args.shift() as Definition<T>["debounce"];
		if (typeof args[0] == "boolean")
			parsed.preventBind = args.shift() as Definition<T>["preventBind"];
		
		return parsed as Definition<T>;
	}
	
	definition.type ??= "object" as T;
	
	return definition;
}

export class SubscriptionGroup<DS extends UnparsedDefinition[] = any[]> extends EventEmitter {
	constructor(
		definitions: DS,
		{
			target,
			debounce: debounceLimit = SubscriptionGroup.debounceLimit,
			immediately
		}: Options = {}
	) {
		super();
		
		this.applyOptions({ target, debounceLimit });
		
		this.#initPromise = new StatefulPromise();
		
		void this.attach(definitions, false, immediately);
		
	}
	
	target?: Target;
	emitUpdate!: () => void;
	
	items = [] as unknown as Record<string, SubscriptionGroupItem> & SubscriptionGroupItem[];
	values = [] as DS extends any ? (any[] & Record<string, any>) : ParseValues<DS>;
	
	isLoaded = false;
	isInited = false;
	
	#loadPromise!: StatefulPromise<SubscriptionGroup>;
	#initPromise: StatefulPromise<SubscriptionGroup>;
	#unloadPromise!: StatefulPromise<SubscriptionGroup>;
	
	#debounceLimit?: number | null = null;
	
	applyOptions({ target, debounceLimit }: { target?: Target; debounceLimit?: number }) {
		
		if (this.target !== target) {
			if (this.target)
				for (const item of this.items)
					if (item.isLoaded && !item.preventBind)
						delete this.target[item.name];
			
			this.target = target;
			
			if (this.target)
				for (const item of this.items)
					if (item.isLoaded && !item.preventBind)
						this.target[item.name] = item.value;
		}
		
		if (this.#debounceLimit !== debounceLimit) {
			this.#debounceLimit = debounceLimit;
			if (typeof this.#debounceLimit == "number") {
				const emitUpdateDebounced = debounce(() => this.emit("update", this.values), this.#debounceLimit);
				this.emitUpdate = () => emitUpdateDebounced();
			} else
				this.emitUpdate = () => this.emit("update", this.values);
		}
		
	}
	
	attach(definitions: DS, shouldReload = this.isLoaded, immediately = true) {
		if (shouldReload)
			this.isLoaded = false;
		
		if (!this.#loadPromise || this.#loadPromise.isFulfilled)
			this.#loadPromise = new StatefulPromise();
		
		if (!this.#unloadPromise || this.#unloadPromise.isFulfilled)
			this.#unloadPromise = new StatefulPromise();
		
		return Promise.all(definitions.map(definition =>
			new SubscriptionGroupItem(parseDefinition(definition), this)
		).map(item => {
			
			if (immediately)
				item.subscribe();
			
			return item.loaded();
		}));
	}
	
	detach(names: string[], shouldUpdate = true) {
		
		for (const name of names)
			this.items[name]?.detach();
		
		if (shouldUpdate) {
			this.#unload();
			this.#load();
		}
		
	}
	
	redefine(definitions: DS) {
		
		const itemsToDetach = new Map(this.items.map(item => [ item.name, item ]));
		const definitionsToRedefine = [];
		const definitionsToAttach = [] as unknown as DS;
		
		for (let definition of definitions) {
			definition = parseDefinition(definition);
			if (itemsToDetach.delete(definition.name))
				definitionsToRedefine.push(definition);
			else
				definitionsToAttach.push(definition);
		}
		
		this.isLoaded = false;
		
		this.detach([ ...itemsToDetach.keys() ], false);
		
		return Promise.all([
			...definitionsToRedefine.map(definition => {
				const item = this.items[definition.name];
				item.define(definition);
				
				item.subscribe();
				
				return item.loaded();
			}),
			...definitionsToAttach.length ? [ this.attach(definitionsToAttach, false) ] : []
		]);
	}
	
	subscribe() {
		return this.items.map(item => item.subscribe());
	}
	
	unsubscribe() {
		return this.items.map(item => item.unsubscribe());
	}
	
	#load() {
		
		if (!this.isLoaded && this.items.every(item => item.isLoaded)) {
			if (this.target)
				for (const item of this.items)
					if (!item.preventBind)
						this.target[item.name] = item.value;
			
			this.isLoaded = true;
			
			for (const item of this.items)
				privates.itemLoad!(item);
			
			this.emit("load", this.values);
			
			if (this.isInited)
				if (this.items.length)
					for (const item of this.items)
						item.emitUpdate();
				else
					this.emitUpdate();
			
			
			this.#loadPromise.resolve(this);
			
			if (this.#unloadPromise.isFulfilled)
				this.#unloadPromise = new StatefulPromise();
		}
		
	}
	
	#init() {
		
		if (!this.isInited && this.items.every(item => item.isInited)) {
			this.isInited = true;
			
			if (this.isLoaded)
				if (this.items.length)
					for (const item of this.items)
						item.emitUpdate();
				else
					this.emitUpdate();
			
			
			for (const item of this.items)
				privates.itemInit!(item);
			
			this.emit("init", this.values);
			
			this.#initPromise.resolve(this);
		}
		
	}
	
	#unload() {
		
		if (this.isLoaded && this.items.every(item => !item.isLoaded)) {
			if (this.target)
				for (const item of this.items)
					if (!item.preventBind)
						delete this.target[item.name];
			
			this.isLoaded = false;
			
			for (const item of this.items)
				privates.itemUnload!(item);
			
			this.emit("unload", this.values);
			
			if (this.items.length)
				for (const item of this.items)
					item.emitUpdate();
			else
				this.emitUpdate();
			
			this.#unloadPromise.resolve(this);
			
			if (this.#loadPromise.isFulfilled)
				this.#loadPromise = new StatefulPromise();
		}
		
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
	
	valueOf() {
		return this.values;
	}
	
	[Symbol.iterator]() {
		return this.values[Symbol.iterator]();
	}
	
	
	static debounceLimit = 8;
	
	static {
		
		privates.groupLoad = (group: SubscriptionGroup) => group.#load();
		privates.groupInit = (group: SubscriptionGroup) => group.#init();
		privates.groupUnload = (group: SubscriptionGroup) => group.#unload();
		
	}
	
}

export { Options as SubscriptionGroupOptions, Target as SubscriptionGroupTarget };
