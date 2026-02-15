import { Err } from "@nesvet/n";


type Payload = Record<string, unknown>;


export class UnauthorizedError extends Err {
	constructor(payload?: Payload) {
		super("Unauthorized", "unauthorized", payload);
		
	}
	
	name = "UnauthorizedError";
	
}


type SubordinationType = "_id" | "permissiveIds" | "slaveIds";

export class SubordinationError extends Err {
	constructor(payload?: Payload);
	constructor(type: SubordinationType, payload?: Payload);
	constructor(type: SubordinationType, ids: string[] | string, payload?: Payload);
	constructor(type?: Payload | SubordinationType, ids?: Payload | string[] | string, payload?: Payload) {
		switch (arguments.length) {
			case 1:
				payload = type as Payload;
				type = undefined;
				break;
			
			case 2:
				payload = ids as Payload;
				ids = undefined;
		}
		
		super("Insubordination attempt", "subordination", {
			...type && { type },
			...ids && { ids: Array.isArray(ids) ? ids : [ ids ] },
			...payload
		});
		
	}
	
	name = "SubordinationError";
	
}


export class PermissionError extends Err {
	constructor(payload?: Payload) {
		super("Insufficient permissions", "permissions", payload);
		
	}
	
	name = "PermissionError";
	
}
