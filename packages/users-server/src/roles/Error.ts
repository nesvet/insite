import { Err } from "@nesvet/n";


type Payload = Record<string, unknown>;


export class RolesError extends Err {
	constructor(roleId: string, payload?: Payload);
	constructor(roleIds: string[], payload?: Payload);
	constructor(stringOrArray: Payload | string[] | string, payload?: Payload) {
		super(`User lacks role${Array.isArray(stringOrArray) ? "s" : ""}`, "lacksroles", {
			roles: Array.isArray(stringOrArray) ? stringOrArray : [ stringOrArray ],
			...payload
		});
		
	}
	
	name = "RolesError";
	
}
