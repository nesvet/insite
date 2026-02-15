import type { Abilities, AbilitiesSchema } from "insite-common";
import { Roles } from "./Roles";
import { RoleDoc } from "./types";


const snapshots = new WeakMap();


export class Role<AS extends AbilitiesSchema> {
	constructor(roles: Roles<AS>, roleDoc: RoleDoc) {
		this.#roles = roles;
		
		this._id = roleDoc._id;
		roles.set(this._id, this);
		
		void this.update(roleDoc);
		
	}
	
	#roles;
	
	_id;
	ownInvolveIds!: string[];
	ownAbilities!: Abilities<AS>;
	title = "";
	displayTitle = "";
	_o = 0;
	
	ownInvolves: Role<AS>[] = [];
	involves = new Set<Role<AS>>();
	abilities: Abilities<AS> = {};
	inheritedAbilities: Abilities<AS> = {};
	
	update({ _id, involves: ownInvolveIds, abilities: ownAbilities, title, ...restProps }: Partial<RoleDoc>) {
		Object.assign(this, restProps);
		
		if (ownInvolveIds)
			this.ownInvolveIds = ownInvolveIds;
		
		if (ownAbilities)
			this.ownAbilities = ownAbilities as Abilities<AS>;
		
		if (title !== undefined) {
			this.title = title;
			this.displayTitle = title || this._id;
		}
		
		if (ownInvolveIds || ownAbilities) {
			const snapshot = [
				this.ownInvolveIds.join(","),
				JSON.stringify(this.ownAbilities)
			].join("\n");
			
			if (snapshot !== snapshots.get(this)) {
				snapshots.set(this, snapshot);
				
				if (this.#roles.users.isInited)
					this.#roles.update();
			}
		}
		
	}
	
	delete() {
		
		this.#roles.delete(this._id);
		
		snapshots.delete(this);
		
		this.#roles.update();
		
	}
	
}
