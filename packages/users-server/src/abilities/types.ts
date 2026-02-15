import type { Prettify } from "@nesvet/n";
import type { AbilitySchema as OriginalAbilitySchema } from "insite-common";


type AbilityParamItem = string;
export type AbilityParamItems = AbilityParamItem[];
export type AbilityParamNumber = number;
export type AbilityParam = AbilityParamItems | AbilityParamNumber;

export type AbilityWithParams = Record<string, AbilityParam>;
export type AbilityObject = Record<string, Ability | AbilityParam>;
export type AbilityBoolean = true;
export type Ability = AbilityBoolean | { [key: string]: Ability | AbilityParam };

export type AbilitySchema = Prettify<
	Omit<OriginalAbilitySchema, "abilities"> & {
		level: number;
		longId: string;
		abilities?: AbilitySchema[];
	}
>;

export type GenericAbilities = Record<string, Ability>;

export function isAbilityObject(value: Ability): value is AbilityObject {
	return typeof value == "object";
}

export function isAbilityParamNumber(value: AbilityParam): value is AbilityParamNumber {
	return typeof value == "number";
}

export function isAbilityParamItems(value: AbilityParam): value is AbilityParamItems {
	return Array.isArray(value);
}
