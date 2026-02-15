import type { AbilitiesSchema } from "insite-common";
import { User } from "../users/User";
import type { Orgs } from "./Orgs";
import type { OrgDoc } from "./types";


const snapshots = new WeakMap();


export class Org<AS extends AbilitiesSchema> {
	constructor(orgs: Orgs<AS>, orgDoc: OrgDoc) {
		this.orgs = orgs;
		
		this._id = orgDoc._id;
		orgs.set(this._id, this);
		
		void this.update(orgDoc);
		
	}
	
	_id;
	title = "";
	initials = "";
	displayLabel = "";
	
	_o = 0;
	
	orgs;
	
	isOrg = true;
	
	ownerOrgs = new Set<Org<AS>>();
	ownerUsers = new Set<User<AS>>();
	
	users = new Set<User<AS>>();
	
	slaveOrgs = new Set<Org<AS>>();
	
	ownerIds: string[] = [];
	
	update({ _id, title, owners: ownerIds, ...restProps }: Partial<OrgDoc>) {
		
		Object.assign(this, restProps);
		
		if (title !== undefined) {
			this.title = title;
			this.initials = title?.[0]?.toUpperCase() ?? "";
			this.displayLabel = title;
		}
		
		if (ownerIds) {
			this.ownerIds = ownerIds;
			
			const snapshot = this.ownerIds.join(",");
			
			if (snapshot !== snapshots.get(this)) {
				snapshots.set(this, snapshot);
				
				if (this.orgs.users.isInited)
					this.orgs.update();
			}
		}
		
	}
	
	async delete() {
		
		this.orgs.delete(this._id);
		
		snapshots.delete(this);
		
		await this.orgs.replace(this._id);
		
		this.orgs.update();
		
	}
	
}
