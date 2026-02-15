import {
	SubscriptionGroup,
	type SubscriptionMapWithSubscription,
	type SubscriptionObjectWithSubscription
} from "insite-subscriptions-client";
import { handleExtendedOrgs, handleOrgs, handleOrgsBeforeSubscribe } from "./orgs";
import { handleRoles } from "./roles";
import { handleUser } from "./user";
import { handleExtendedUsers, handleUsers } from "./users";
import type { UsersSubscriptionGroupOptions } from "./types";


export class UsersSubscriptionGroup extends SubscriptionGroup<[
	[ "orgs", SubscriptionMapWithSubscription | "map", typeof handleOrgs, typeof handleOrgsBeforeSubscribe ],
	[ "users", SubscriptionMapWithSubscription | "map", typeof handleUsers ],
	[ "user", SubscriptionObjectWithSubscription | [ true ], typeof handleUser ]
] | [
	[ "roles", "map", typeof handleRoles ],
	[ "extendedUsers", "map", "users.extended", typeof handleExtendedUsers, true ],
	[ "extendedOrgs", "map", "orgs.extended", typeof handleExtendedOrgs, true ]
]> {
	constructor({ values, ...options }: UsersSubscriptionGroupOptions) {
		super([
			[ "orgs", values?.orgs ?? "map", handleOrgs, handleOrgsBeforeSubscribe ],
			[ "users", values?.users ?? "map", handleUsers ],
			[ "user", values?.user ?? [ true ], handleUser ]
		], options);
	}
	
	isExtended: boolean | null = false;
	
	extend() {
		
		if (this.isExtended === false) {
			this.isExtended = null;
			
			return this.attach([
				[ "roles", "map", handleRoles ],
				[ "extendedUsers", "map", "users.extended", handleExtendedUsers, true ],
				[ "extendedOrgs", "map", "orgs.extended", handleExtendedOrgs, true ]
			]).then(() => {
				
				this.isExtended = true;
				
			});
		}
	}
	
	unextend() {
		
		if (this.isExtended) {
			this.isExtended = false;
			
			this.detach([ "roles", "extendedUsers", "extendedOrgs" ]);
		}
		
	}
	
}
