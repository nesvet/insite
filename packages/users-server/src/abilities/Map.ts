import {
	add,
	assignPath,
	deletePath,
	empty,
	getPath,
	intersection,
	pick,
	setPath
} from "@nesvet/n";
import type { Abilities, AbilitiesSchema, AbilityParamSchema } from "insite-common";
import {
	isAbilityObject,
	isAbilityParamItems,
	isAbilityParamNumber,
	type Ability,
	type AbilityObject,
	type AbilityParam,
	type AbilityParamItems,
	type AbilityParamNumber,
	type AbilitySchema,
	type GenericAbilities
} from "./types";


const schemaParentMap = new Map<AbilitySchema, AbilitySchema | null>();


export class AbilitiesMap<AS extends AbilitiesSchema> extends Map<string, AbilitySchema> {
	constructor(abilitiesSchema: AS) {
		super();
		
		for (const subSchema of abilitiesSchema) {
			delete subSchema.top;/* The first level is always top */
			
			this.#hierarchical.push(subSchema as AbilitySchema);
		}
		
		(function parse(this: AbilitiesMap<AS>, schemas: AbilitiesSchema, parent: AbilitySchema | null, level: number) {
			for (const schema of schemas as AbilitySchema[]) {
				schemaParentMap.set(schema, parent);
				
				schema.level = level;
				
				if (!parent || schema.top) {
					schema.longId = schema._id;
					
					if (this.has(schema._id))
						throw new Error(`Top-level ability duplicate: ${schema._id}`);
					
					this.set(schema._id, schema);
				} else
					schema.longId = parent ? `${parent.longId}.${schema._id}` : schema._id;
				
				if (schema.abilities)
					parse.call(this, schema.abilities, schema, level + 1);
			}
			
		}).call(this, abilitiesSchema, null, 0);
		
	}
	
	#hierarchical: AbilitySchema[] = [];
	
	get(longId: string, parent?: AbilitySchema | null) {
		const subIds = longId.split(".");
		let schema = parent ?? super.get(subIds.shift()!);
		
		if (schema && subIds.length)
			for (const subId of subIds) {
				schema = schema?.abilities?.find(({ _id, top }) => !top && _id === subId);
				if (!schema)
					break;
			}
		
		return schema;
	}
	
	getSchema = this.get;
	
	getParamSchema(longId: string, paramId: string) {
		return this.get(longId)?.params?.find(({ _id }) => _id === paramId);
	}
	
	getDefaultParam(longId: string, paramId: string, max?: boolean): AbilityParam | undefined;
	getDefaultParam(schema: AbilityParamSchema, max?: boolean): AbilityParam;
	getDefaultParam(schemaOrLongId: AbilityParamSchema | string, paramIdOrMax?: boolean | string, max?: boolean) {
		if (paramIdOrMax === undefined || typeof paramIdOrMax == "boolean")
			max = paramIdOrMax;
		
		const schema = typeof schemaOrLongId == "string" ? this.getParamSchema(schemaOrLongId, paramIdOrMax as string) : schemaOrLongId;
		
		if (schema)
			switch (schema.type) {
				case "number":
					return max ?
						(schema.max ?? Infinity) :
						(schema.min ?? 0);
				
				case "items":
					return max ?
						schema.items.map(({ _id }) => _id) :
						[];
			}
		
		return undefined;// eslint-disable-line unicorn/no-useless-undefined
	}
	
	getDefaultAbility(schema: string, max?: boolean): Ability | undefined;
	getDefaultAbility(schema: AbilitySchema, max?: boolean): Ability;
	getDefaultAbility(schema: AbilitySchema | string, max: boolean = !schema): Ability | undefined {
		if (typeof schema == "string")
			schema = this.get(schema)!;
		
		if (schema) {
			if (schema.abilities || schema.params) {
				const ability = {} as AbilityObject;
				
				if (schema.params)
					for (const paramSchema of schema.params)
						ability[paramSchema._id] = this.getDefaultParam(paramSchema, max);
				
				if (max && schema.abilities)
					for (const subSchema of schema.abilities)
						if (!subSchema.top)
							ability[subSchema._id] = this.getDefaultAbility(subSchema, max);
				
				return ability;
			}
			
			return true;
		}
		
		return undefined;
	}
	
	getDefaultAbilities(): Abilities<AS>;
	getDefaultAbilities(schemas: AbilitySchema[], max?: boolean): Abilities<AS>;
	getDefaultAbilities(schema: AbilitySchema, max?: boolean): Abilities<AS>;
	getDefaultAbilities(longIds: string[], max?: boolean): Abilities<AS>;
	getDefaultAbilities(longId: string, max?: boolean): Abilities<AS>;
	getDefaultAbilities(schemasOrIds?: (AbilitySchema | string)[] | AbilitySchema | string, max: boolean = !schemasOrIds) {
		
		const schemas = (
			schemasOrIds ?
				(Array.isArray(schemasOrIds) ? schemasOrIds : [ schemasOrIds ])
					.map(schema => (typeof schema == "string" ? this.get(schema) : schema))
					.filter(Boolean) as AbilitySchema[] :
				[ ...this.values() ]
		).sort((a, b) => a.level - b.level);
		
		const schemaMaxMap = new Map<AbilitySchema, boolean>();
		
		for (const schema of schemas) {
			(function resolve(_schema) {
				const parentSchema = schemaParentMap.get(_schema);
				
				if (parentSchema) {
					resolve(parentSchema);
					
					if (!schemaMaxMap.has(parentSchema))
						schemaMaxMap.set(parentSchema, false);
				}
				
			})(schema);
			
			if (max)
				(function resolve(_schema) {
					if (!schemaMaxMap.has(_schema))
						schemaMaxMap.set(_schema, true);
					
					if (_schema.abilities)
						for (const subSchema of _schema.abilities)
							if (subSchema.top)
								resolve(subSchema);
					
				})(schema);
			else
				if (!schemaMaxMap.has(schema))
					schemaMaxMap.set(schema, false);
		}
		
		return assignPath(
			{},
			Object.fromEntries(
				[ ...schemaMaxMap ]
					.map(([ schema, _max ]) => [ schema.longId, this.getDefaultAbility(schema, _max) ])
			)
		);
	}
	
	getSchemeFor(abilities: GenericAbilities) {
		abilities = this.adjust(structuredClone(abilities));
		
		return (function resolve(subSchemas: AbilitySchema[], subAbilities: GenericAbilities) {
			for (let i = 0; i < subSchemas.length; i++) {
				const schema = subSchemas[i];
				const ability = schema.top ? abilities[schema._id] : subAbilities[schema._id];
				
				if (ability) {
					if (schema.params)
						for (const paramSchema of schema.params) {
							const abilityParam = (ability as AbilityObject)[paramSchema._id];
							
							switch (paramSchema.type) {
								case "number":
									paramSchema.max = abilityParam as AbilityParamNumber;
									break;
								
								case "items":
									paramSchema.items = paramSchema.items.filter(({ _id }) => (abilityParam as AbilityParamItems).includes(_id));
							}
						}
					
					if (schema.abilities) {
						resolve(schema.abilities, ability as GenericAbilities);
						
						if (!schema.abilities.length)
							delete schema.abilities;
					}
				} else
					subSchemas.splice(i--, 1);
			}
			
			return subSchemas;
		})(structuredClone(this.#hierarchical), abilities);
	}
	
	getParam(abilities: GenericAbilities, longId: string, paramId: string) {
		if (this.getParamSchema(longId, paramId)) {
			const value = getPath(abilities, `${longId}.${paramId}`) as AbilityParam;
			
			if (this.isParamFits(longId, paramId, value))
				return value;
			
			return this.getDefaultParam(longId, paramId)!;
		}
		
		return undefined;// eslint-disable-line unicorn/no-useless-undefined
	}
	
	setParam(abilities: GenericAbilities, longId: string, paramId: string, value: AbilityParam): Abilities<AS> {
		const schema = this.getParamSchema(longId, paramId);
		
		if (!schema)
			throw new Error(`No such ability param: ${longId}.${paramId}`);
		
		setPath(abilities, `${longId}.${paramId}`, this.adjustParam(schema, value));
		
		return abilities as Abilities<AS>;
	}
	
	isParamFits(longId: string, paramId: string, value: AbilityParam, referenceValue?: AbilityParam) {
		if (value !== undefined) {
			const paramSchema = this.getParamSchema(longId, paramId);
			
			if (paramSchema)
				switch (paramSchema.type) {
					case "number":
						return (
							isAbilityParamNumber(value) &&
							(paramSchema.min === undefined || value >= paramSchema.min) && (
								referenceValue === undefined ?
									(paramSchema.max === undefined || value <= paramSchema.max) :
									value <= (referenceValue as AbilityParamNumber)
							)
						);
					
					case "items":
						return (
							isAbilityParamItems(value) &&
							value.length === new Set(value).size && (
								referenceValue === undefined ?
									value.every(itemId => paramSchema.items.find(({ _id }) => _id === itemId)) :
									value.every(itemId => (referenceValue as AbilityParamItems).includes(itemId))
							)
						);
				}
		}
		
		return false;
	}
	
	adjustParam(paramSchema: AbilityParamSchema, value: AbilityParam) {
		switch (paramSchema.type) {
			case "number":
				return (
					isAbilityParamNumber(value) ?
						Math.max(
							Math.min(
								value,
								paramSchema.max ?? Infinity
							),
							paramSchema.min ?? 0
						) :
						paramSchema.min ?? 0
				);
			
			default/* paramSchema.type === "items" */:
				return (
					isAbilityParamItems(value) ?
						intersection(paramSchema.items.map(item => item._id), value) :
						[]
				) as AbilityParamItems;
		}
		
	}
	
	adjust(abilities: GenericAbilities, parent?: AbilitySchema | null): Abilities<AS> {
		const adjustedAbilities: GenericAbilities = {};
		
		for (const [ _id, ability ] of Object.entries(abilities)) {
			const schema = this.get(_id, parent);
			
			if (schema)
				if (schema.params || schema.abilities) {
					const adjustedAbility: AbilityObject = {};
					
					if (schema.params)
						if (isAbilityObject(ability))
							for (const paramSchema of schema.params)
								adjustedAbility[paramSchema._id] = this.adjustParam(paramSchema, ability[paramSchema._id] as AbilityParam);
						else
							for (const paramSchema of schema.params)
								adjustedAbility[paramSchema._id] = this.getDefaultParam(paramSchema);
					
					if (schema.abilities && isAbilityObject(ability))
						Object.assign(
							adjustedAbility,
							this.adjust(
								pick(
									ability,
									schema.abilities
										.filter(subSchema => !subSchema.top)
										.map(subSchema => subSchema._id)
								) as GenericAbilities,
								schema
							)
						);
					
					adjustedAbilities[_id] = adjustedAbility;
				} else
					adjustedAbilities[_id] = true;
		}
		
		return Object.assign(empty(abilities), adjustedAbilities) as Abilities<AS>;
	}
	
	merge(target: GenericAbilities, source: GenericAbilities, parent?: AbilitySchema | null): Abilities<AS> {
		if (!parent) {
			this.adjust(target);
			source = this.adjust(structuredClone(source));
		}
		
		for (const [ _id, ability ] of Object.entries(source)) {
			const schema = this.get(_id, parent);
			
			if (schema && schema.isInheritable !== false)
				if (_id in target && (schema.params || schema.abilities)) {
					const targetAbility = target[_id] as AbilityObject;
					const sourceAbility = ability as AbilityObject;
					
					if (schema.params)
						for (const paramSchema of schema.params)
							if (paramSchema.isInheritable !== false)
								switch (paramSchema.type) {
									case "number":
										targetAbility[paramSchema._id] =
											Math.max(
												targetAbility[paramSchema._id] as AbilityParamNumber,
												sourceAbility[paramSchema._id] as AbilityParamNumber
											);
										break;
									
									case "items":
										add(
											targetAbility[paramSchema._id] as AbilityParamItems,
											...sourceAbility[paramSchema._id] as AbilityParamItems
										);
								}
					
					if (schema.abilities)
						this.merge(targetAbility as GenericAbilities, sourceAbility as GenericAbilities, schema);
				} else
					target[_id] = ability;
		}
		
		return target as Abilities<AS>;
	}
	
	hasAbility(abilities: GenericAbilities, longId: string) {
		return Boolean(getPath(abilities, longId));
	}
	
	setAbility(target: GenericAbilities, schema: AbilitySchema): Abilities<AS>;
	setAbility(target: GenericAbilities, longId: string): Abilities<AS>;
	setAbility(target: GenericAbilities, schemaOrLongId: AbilitySchema | string) {
		const schema = typeof schemaOrLongId == "string" ? this.get(schemaOrLongId) : schemaOrLongId;
		
		if (!schema)
			throw new Error(`No such ability: ${schemaOrLongId as string}`);
		
		this.merge(target, this.getDefaultAbilities(schema));
		
		return target as Abilities<AS>;
	}
	
	unsetAbility(target: GenericAbilities, schema: AbilitySchema): Abilities<AS>;
	unsetAbility(target: GenericAbilities, longId: string): Abilities<AS>;
	unsetAbility(target: GenericAbilities, schemaOrLongId: AbilitySchema | string) {
		const schema = typeof schemaOrLongId == "string" ? this.get(schemaOrLongId) : schemaOrLongId;
		
		if (!schema)
			throw new Error(`No such ability: ${schemaOrLongId as string}`);
		
		(function resolve(_schema) {
			deletePath(target, _schema.longId);
			
			if (_schema.abilities)
				for (const subSchema of _schema.abilities)
					resolve(subSchema);
			
		})(schema);
		
		return target;
	}
	
}
