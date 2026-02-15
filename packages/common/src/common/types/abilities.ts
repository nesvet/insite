/* eslint-disable @typescript-eslint/no-explicit-any */


type CommonSchema = {
	_id: string;
	title?: string;
	description?: string;
};

export type AbilityParamItemSchema = CommonSchema;

type AbilityParamItemsSchema = CommonSchema & {
	type: "items";
	items: readonly AbilityParamItemSchema[];
	isInheritable?: boolean;
};

type AbilityParamNumberSchema = CommonSchema & {
	type: "number";
	min?: number;
	max?: number;
	isInheritable?: boolean;
};

export type AbilityParamSchema = AbilityParamItemsSchema | AbilityParamNumberSchema;

export type AbilitySchema = CommonSchema & {
	params?: readonly AbilityParamSchema[];
	abilities?: AbilitiesSchema;
	isInheritable?: boolean;
	top?: boolean;
};

export type AbilitiesSchema = readonly AbilitySchema[];


type SettleParam<PS extends AbilityParamSchema> =
	PS extends AbilityParamNumberSchema ?
		number :
		PS extends AbilityParamItemsSchema ?
			PS["items"][number]["_id"][] :
			never;

type SettleParams<A extends AbilitySchema> =
	A["params"] extends readonly AbilityParamSchema[] ?
		{ [P in A["params"][number] as P["_id"]]: SettleParam<P> } :
		never;

type SettleSubAbilities<A extends AbilitySchema> =
	A["abilities"] extends AbilitiesSchema ?
		Partial<{ [SA in A["abilities"][number] as SA["top"] extends true ? never : SA["_id"]]: SettleAbility<SA> }> :
		never;

type SettleAbility<A extends AbilitySchema> =
	A extends { params: any } ?
		A extends { abilities: any } ?
			SettleParams<A> & SettleSubAbilities<A> :
			SettleParams<A> :
		A extends { abilities: any } ?
			SettleSubAbilities<A> :
			true;


type SettleTopLevelAbility<A extends AbilitySchema> = { [K in A["_id"]]: SettleAbility<A> };

type TakeAbilitySchema<A extends AbilitySchema, ForceTopLevel = false> =
	(
		A["abilities"] extends AbilitiesSchema ?
			ScanAbilitySchemas<A["abilities"]> :
			object
	) & (
		ForceTopLevel extends true ?
			SettleTopLevelAbility<A> :
			A["top"] extends true ?
				SettleTopLevelAbility<A> :
		object
	);

export type ScanAbilitySchemas<AS extends AbilitiesSchema, ForceTopLevel = false> =
	Partial<
		AS extends readonly [ infer Head extends AbilitySchema, ...infer Tail extends AbilitiesSchema ] ?
			ScanAbilitySchemas<Tail, ForceTopLevel> & TakeAbilitySchema<Head, ForceTopLevel> :
		object
	>;


type BasisAbilities = {
	login?: {
		sessionsLimit: number;
	};
	inSite?: {
		users?: {
			roles?: true;
		};
	};
};


export type Abilities<AS extends AbilitiesSchema> = BasisAbilities & ScanAbilitySchemas<AS, true>;
