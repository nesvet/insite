import { getAll } from "@nesvet/n";
import type { SubscriptionMapUpdated } from "insite-subscriptions-client";
import type {
	Org,
	OrgExtension,
	Orgs,
	OrgsExtended,
	User
} from "./types";
import type { UsersSubscriptionGroup } from "./UsersSubscriptionGroup";


export function handleOrgsBeforeSubscribe(orgs: Orgs) {
	orgs.null = {
		_id: null,
		title: "",
		initials: "—",
		displayLabel: "—",
		isOrg: true,
		users: Object.assign(new Set<User>(), { sorted: [] })
	};
	
}

/** @this UsersSubscriptionGroup */
export function handleOrgs(this: UsersSubscriptionGroup, updated: SubscriptionMapUpdated<Org> | null) {
	if (updated)
		for (const org of updated.added) {
			org.isOrg = true;
			
			org.users = Object.assign(new Set<User>(), { sorted: [] });
		}
	else {
		this.values.orgs.null.users.clear();
		this.values.orgs.null.users.sorted.length = 0;
	}
	
}

/** @this UsersSubscriptionGroup */
export function handleExtendedOrgs(this: UsersSubscriptionGroup, updated: SubscriptionMapUpdated<OrgExtension> | null) {
	
	const orgs = this.values.orgs as OrgsExtended;
	
	if (updated) {
		const { users, extendedOrgs } = this.values;
		
		for (const orgExtension of updated) {
			const org = orgs.get(orgExtension._id)!;
			
			org.owners = orgExtension.owners.map(_id => users.get(_id) || orgs.get(_id));
			org.slaveOrgs = getAll(orgs, orgExtension.slaveOrgs, true);
			org.note = orgExtension.note;
			org._l = 0;
		}
		
		const sortedHierarchically = [];
		
		for (const orgExtension of extendedOrgs.sorted) {
			const org = orgs.get(orgExtension._id)!;
			
			for (const slaveOrg of org.slaveOrgs!)
				slaveOrg._l = org._l! + 1;
			
			sortedHierarchically.push(org);
		}
		
		orgs.sortedHierarchically = sortedHierarchically;
		
		if (this.isLoaded) {
			this.items.users.emitUpdate();
			this.items.orgs.emitUpdate(updated);
		}
	} else {
		for (const org of orgs.sorted) {
			delete org.owners;
			delete org.slaveOrgs;
			delete org.note;
			delete org._l;
		}
		delete orgs.sortedHierarchically;
	}
	
}
