import {
	_ids,
	includesAny,
	intersection,
	pick
} from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import { ChangeStreamDocument, Sort } from "insite-db";
import { CollectionMapPublication, Projection, Publication } from "insite-subscriptions-server/ws";
import type {
	AbilitiesMap,
	OrgDoc,
	Orgs,
	RoleDoc,
	Roles,
	Session,
	SessionDoc,
	Sessions,
	User,
	UserDoc,
	Users
} from "insite-users-server";


export class AbilitiesPublication<AS extends AbilitiesSchema> extends Publication<AS, [], User<AS>, Session<AS>> {
	constructor(abilities: AbilitiesMap<AS>) {
		super("abilities", {
			
			fetch({ user }) {
				if (user?.abilities.inSite?.users?.roles)
					return { abilities: abilities.getSchemeFor(user.abilities) };
				
				return null;
			}
			
		});
	}
}


export type RolesPublicationOptions = {
	projection?: Projection;
	sort?: Sort;
	transform?: (roleDoc: object) => void;
};

export class RolesPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, RoleDoc, [], User<AS>, Session<AS>> {
	constructor(roles: Roles<AS>, options: RolesPublicationOptions = {}) {
		
		const {
			projection = { title: 1, description: 1 },
			sort = { _o: 1 },
			transform
		} = options;
		
		Object.assign(projection, { involves: 1, abilities: 1 });
		
		super(roles.collection, "roles", ({ user }) => user?.abilities.inSite?.users && {
			query: { _id: { $in: user.slaveRoleIds } },
			projection,
			sort
		}, roleDoc => {
			const { involves, abilities, inheritedAbilities, displayTitle, _o } = roles.get(roleDoc._id)!;
			
			Object.assign(roleDoc, {
				...roleDoc.involves ? {
					ownInvolves: roleDoc.involves,
					involves: _ids(involves),
					abilities,
					inheritedAbilities
				} : {},
				...projection.title ? { displayTitle } : {},
				_o
			});
			
			transform?.(roleDoc);
			
		});
		
	}
	
}


const userSubscriptionChangeListenerMap = new WeakMap<object, (next: ChangeStreamDocument<UserDoc>) => void>();

export type UserPublicationOptions = {
	fieldsToUpdate?: string[];
	projection?: Projection;
	transform?: (userDoc: object) => void;
	public?: boolean;
};

export class UserPublication<AS extends AbilitiesSchema> extends Publication<AS, [ boolean ], User<AS>, Session<AS>> {
	constructor(users: Users<AS>, options: UserPublicationOptions = {}) {
		
		const {
			fieldsToUpdate = [],
			projection,
			transform,
			public: isPublic
		} = options;
		
		for (const key of [
			"email",
			"name",
			"name.first",
			"name.middle",
			"name.last",
			"org",
			"job",
			"avatar"
		] as const)
			if (!projection || projection[key] !== 0)
				fieldsToUpdate.push(key);
		
		const fieldsToPick: (keyof User<AS>)[] = [
			"_id",
			"email",
			"name",
			"initials",
			"displayLabel",
			"job",
			"avatarUrl",
			"abilities"
		];
		
		if (!isPublic)
			fieldsToPick.push("slaveIds");
		
		super("user", {
			
			onSubscribe(subscription) {
				const [ { user } ] = subscription.args;
				
				if (user) {
					const { _id } = user;
					
					const changeListener = (next: ChangeStreamDocument<UserDoc>) => {
						if ("documentKey" in next && next.documentKey._id === _id)
							switch (next.operationType) {
								case "update":
									if (!includesAny(Object.keys(next.updateDescription.updatedFields!), fieldsToUpdate))
										break;
								
								case "replace":// eslint-disable-line no-fallthrough
								case "delete":
									void subscription.changed(next);
							}
						
					};
					
					users.collection.onChange(changeListener);
					
					userSubscriptionChangeListenerMap.set(subscription, changeListener);
				}
				
			},
			
			fetch({ user, session }, isSessionIdRequired) {
				if (user) {
					const userDoc = pick(user, fieldsToPick);
					
					if (!isPublic)
						Object.assign(userDoc, {
							orgId: user.org._id,
							sessionId: isSessionIdRequired ? session?._id : undefined,
							isOnline: true
						});
					
					if (projection)
						for (const key in projection)
							if (projection[key] && key in user)
								Object.assign(userDoc, { [key]: user[key as keyof typeof user] });
							else
								delete userDoc[key as keyof typeof userDoc];
					
					transform?.(userDoc);
					
					return userDoc;
				}
				
				return null;
			},
			
			onUnsubscribe(subscription) {
				const changeListener = userSubscriptionChangeListenerMap.get(subscription);
				
				if (changeListener)
					users.collection.removeChangeListener(changeListener);
				
			}
			
		});
		
	}
}


export type UsersPublicationOptions = {
	projection?: Projection;
	sort?: Sort;
	transform?: (userDoc: object) => void;
};

export class UsersPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, UserDoc, [], User<AS>, Session<AS>> {
	constructor(users: Users<AS>, options: UsersPublicationOptions = {}) {
		
		const {
			projection = { email: 1, name: 1, org: 1, job: 1, avatar: 1 },
			sort = { "name.last": 1 },
			transform
		} = options;
		
		super(users.collection, "users", wssc => wssc.user?.abilities.login && {
			query: {},
			projection,
			sort
		}, userDoc => {
			
			const user = users.get(userDoc._id)!;
			
			Object.assign(
				userDoc,
				pick(user, [
					"initials",
					"displayLabel",
					"avatarUrl",
					"isOnline"
				]),
				{ orgId: userDoc.org }
			);
			
			delete userDoc.org;
			delete userDoc.avatar;
			
			transform?.(userDoc);
			
		});
		
	}
}


export type UsersExtendedPublicationOptions = {
	projection?: Projection;
	sort?: Sort;
	triggers?: string[];
	transform?: (userDoc: object) => void;
};

export class UsersExtendedPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, UserDoc, [], User<AS>, Session<AS>> {
	constructor(users: Users<AS>, options: UsersExtendedPublicationOptions = {}) {
		
		const {
			projection = { _id: 1 },
			sort,
			triggers = [],
			transform
		} = options;
		
		if (!triggers.includes("roles"))
			triggers.push("roles");
		
		super(users.collection, "users.extended", ({ user }) => user?.abilities.inSite?.users && {
			query: { _id: { $in: user.slaveIds } },
			projection,
			sort,
			triggers
		}, (userDoc, [ wssc ]) => {
			const user = users.get(userDoc._id)!;
			
			Object.assign(userDoc, {
				roleIds: intersection(user.ownRoleIds, wssc.user!.slaveRoleIds)
			});
			
			transform?.(userDoc);
			
		});
		
	}
}


export class SessionsPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, SessionDoc, [ string ], User<AS>, Session<AS>> {
	constructor(sessions: Sessions<AS>) {
		super(sessions.collection, "users.people.sessions", ({ user }, userId) =>
			user?.abilities.inSite?.users && user.permissiveIds.includes(userId) && {
				query: { user: userId },
				projection: { remoteAddress: 1, isOnline: 1, prolongedAt: 1 },
				sort: { prolongedAt: -1 }
			}
		);
	}
}


export type OrgsPublicationOptions = {
	projection?: Projection;
	sort?: Sort;
	transform?: (orgDoc: object) => void;
};

export class OrgsPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, OrgDoc, [], User<AS>, Session<AS>> {
	constructor(orgs: Orgs<AS>, options: OrgsPublicationOptions = {}) {
		
		const {
			projection = { title: 1 },
			sort = { title: 1 },
			transform
		} = options;
		
		super(orgs.collection, "orgs", wssc => wssc.user?.abilities.login && {
			query: {},
			projection,
			sort
		}, orgDoc => {
			const org = orgs.get(orgDoc._id)!;
			
			Object.assign(orgDoc, pick(org, [ "initials", "displayLabel" ]));
			
			transform?.(orgDoc);
			
		});
		
	}
	
}


export type OrgsExtendedPublicationOptions = {
	projection?: Projection;
	sort?: Sort;
	triggers?: string[];
	transform?: (orgDoc: object) => void;
};

export class OrgsExtendedPublication<AS extends AbilitiesSchema> extends CollectionMapPublication<AS, OrgDoc, [], User<AS>, Session<AS>> {
	constructor(orgs: Orgs<AS>, options: OrgsExtendedPublicationOptions = {}) {
		
		const {
			projection = { note: 1 },
			sort = { _o: 1 },
			triggers = [],
			transform
		} = options;
		
		if (!triggers.includes("owners"))
			triggers.push("owners");
		
		super(orgs.collection, "orgs.extended", ({ user }) => user?.abilities.inSite?.users && {
			query: { _id: { $in: user.slaveIds } },
			projection,
			sort,
			triggers
		}, (orgDoc, [ { user } ]) => {
			const org = orgs.get(orgDoc._id)!;
			
			const { ownerIds, slaveOrgs, _o } = org;
			
			Object.assign(orgDoc, {
				owners: intersection(ownerIds, user!.slaveIds),
				slaveOrgs: _ids(intersection(slaveOrgs, user!.slaveOrgs)),
				_o
			});
			
			transform?.(orgDoc);
			
		});
		
	}
	
}
