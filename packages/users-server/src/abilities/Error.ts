import { Err } from "@nesvet/n";


type Payload = Record<string, unknown>;


export class AbilityError extends Err {
	constructor(payload?: Payload);
	constructor(longId: string, payload?: Payload);
	constructor(longId?: Payload | string, payload?: Payload) {
		if (typeof longId == "object") {
			payload = longId;
			longId = undefined;
		}
		
		super("User lacks ability", "lacksability", {
			...longId && { ability: longId },
			...payload
		});
		
	}
	
	name = "AbilityError";
	
}
