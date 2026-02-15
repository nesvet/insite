import { getAll, removeOne } from "@nesvet/n";
import type { SubscriptionMapUpdated } from "insite-subscriptions-client";
import type {
	CurrentUser,
	NullOrg,
	Org,
	Orgs,
	Roles,
	User,
	UserExtension,
	Users,
	UsersExtended
} from "./types";
import type { UsersSubscriptionGroup } from "./UsersSubscriptionGroup";


/** @this UsersSubscriptionGroup */
export function handleUsers(this: UsersSubscriptionGroup, updated: SubscriptionMapUpdated<User> | null) {
	if (updated) {
		const users = this.values.users as Users;
		const currentUser = this.values.user as CurrentUser;
		const orgs = this.values.orgs as Orgs;
		
		if (users.get(currentUser._id) !== currentUser) {
			users.set(currentUser._id, currentUser);
			users.sorted[users.sorted.findIndex(user => user._id === currentUser._id)] = currentUser;
		}
		const updatedUserIndex = updated.findIndex(user => user._id === currentUser._id);
		
		if (~updatedUserIndex)
			updated[updatedUserIndex] = currentUser;
		
		const addedUserIndex = updated.added.findIndex(user => user._id === currentUser._id);
		
		if (~addedUserIndex)
			updated.added[updatedUserIndex] = currentUser;
		
		for (const user of updated.added)
			user.isUser = true;
		
		let shouldUpdateUser;
		const orgsToSortUsers = new Set<NullOrg | Org>();
		
		for (const user of updated) {
			const org = orgs.get(user.orgId) ?? orgs.null;
			
			if (user.org !== org) {
				if (user.org) {
					user.org.users.delete(user);
					removeOne(user.org.users.sorted, user);
				}
				user.org = org;
				user.org.users.add(user);
				user.org.users.sorted.push(user);
			}
			
			orgsToSortUsers.add(user.org);
			
			if (user === currentUser)
				shouldUpdateUser = true;
		}
		
		for (const org of orgsToSortUsers)
			org.users.sorted.sort(users.sortCompareFunction!);
		
		if (updated.deleted.length)
			for (const org of [ ...orgs.sorted, orgs.null ])
				for (const user of org.users)
					if (!users.has(user._id)) {
						org.users.delete(user);
						removeOne(org.users.sorted, user);
					}
		
		if (this.isLoaded) {
			if (shouldUpdateUser)
				this.items.user.emitUpdate();
			this.items.orgs.emitUpdate();
		}
	}
	
}

/** @this UsersSubscriptionGroup */
export function handleExtendedUsers(this: UsersSubscriptionGroup, updated: SubscriptionMapUpdated<UserExtension> | null) {
	
	const users = this.values.users as UsersExtended;
	
	if (updated) {
		const roles = this.values.roles as Roles;
		
		for (const userExtension of updated) {
			const user = users.get(userExtension._id)!;
			
			user.roles = getAll(roles, userExtension.roleIds, true);
		}
	} else
		for (const user of users.sorted)
			delete user.roles;
	
}
