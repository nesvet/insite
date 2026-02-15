import type { Abilities, AbilitiesSchema } from "insite-common";
import type {
	SubscriptionGroupOptions,
	SubscriptionMapWithSubscription,
	SubscriptionObjectWithSubscription
} from "insite-subscriptions-client";


export type UsersSubscriptionGroupOptions = SubscriptionGroupOptions & {
	values?: {
		orgs: SubscriptionMapWithSubscription;
		users: SubscriptionMapWithSubscription;
		user: SubscriptionObjectWithSubscription;
	};
};

export type Org = {
	_id: string;
	title: string;
	initials: string;
	displayLabel: string;
	isOrg: true;
	users: Set<User> & { sorted: User[] };
};

export type NullOrg = Omit<Org, "_id"> & { _id: null };

export type OrgExtension = {
	_id: string;
	owners: string[];
	slaveOrgs: string[];
	note: string;
};

export type OrgExtended = Org & {
	owners?: (OrgExtended | User)[];
	slaveOrgs?: OrgExtended[];
	note?: string;
	_l?: number;
};

type OrgsExtra = {
	null: NullOrg;
};

export type Orgs = OrgsExtra & SubscriptionMapWithSubscription<Org>;

export type OrgsExtended = OrgsExtra & SubscriptionMapWithSubscription<OrgExtended> & {
	sortedHierarchically?: OrgExtended[];
};

export type Role = {
	_id: string;
	ownInvolves: Role[];
	involves: Role[];
	_l: number;
};

export type Roles = SubscriptionMapWithSubscription<Role>;

export type CurrentUser<AS extends AbilitiesSchema = AbilitiesSchema> = UserExtended & {
	abilities: Abilities<AS>;
	sessionId?: string;
	slaveIds: string[];
	slavesSnapshot: string;
	slaves: (Org | User)[];
	slaveUsers: User[];
	slaveOrgs: Org[];
};

export type User = {
	_id: string;
	isUser: true;
	email: string;
	name: {
		first: string;
		middle: string;
		last: string;
	};
	orgId: string;
	job: string;
	initials: string;
	displayLabel: string;
	avatarUrl: string;
	isOnline: boolean;
	org: NullOrg | Org;
};

export type UserExtension = {
	_id: string;
	roleIds: string[];
};

export type UserExtended = User & {
	roles?: Role[];
};

export type Users = SubscriptionMapWithSubscription<User>;

export type UsersExtended = SubscriptionMapWithSubscription<UserExtended>;
