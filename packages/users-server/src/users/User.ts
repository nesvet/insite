import {
	_ids,
	debounce,
	empty,
	hasAny,
	removeOne
} from "@nesvet/n";
import type { Abilities, AbilitiesSchema } from "insite-common";
import type { GenericAbilities } from "../abilities/types";
import type { Org } from "../orgs/Org";
import type { Role } from "../roles/Role";
import type { Session } from "../sessions/Session";
import type { UserDoc } from "./types";
import type { Users } from "./Users";


const rolesSnapshots = new WeakMap();
const permissionsSnapshots = new WeakMap();

const staticUrl = process.env.INSITE_STATIC_URL ?? "";


export class User<AS extends AbilitiesSchema> {
	constructor(users: Users<AS>, userDoc: UserDoc) {
		this.#users = users;
		
		this._id = userDoc._id;
		users.set(this._id, this);
		
		void this.update(userDoc);
		
		if (users.isInited)
			users.emit("user-create", this);
		
	}
	
	_id;
	email!: string;
	name = {
		first: "",
		middle: "",
		last: ""
	};
	
	initials = "";
	displayLabel = "";
	org!: Org<AS>;
	job: string = "";
	avatar: string | null = null;
	avatarUrl: string | null = null;
	
	#users;
	
	isUser = true;
	isRoot?: boolean;
	
	roles = new Set<Role<AS>>();
	ownRoles: Role<AS>[] = [];
	ownRoleIds: string[] = [];
	slaveRoles = new Set<Role<AS>>();
	slaveRoleIds: string[] = [];
	abilities: Abilities<AS> = {};
	
	slaveOrgs = new Set<Org<AS>>();
	slaveUsers = new Set<User<AS>>();
	slaves = new Set<Org<AS> | User<AS>>();
	
	slaveIds: string[] = [];
	permissiveIds: string[] = [];
	
	sessions = new Set<Session<AS>>();
	
	isOnline = false;
	
	update({ _id, name, email, roles: ownRoleIds, org: orgId, avatar, ...restProps }: Partial<UserDoc>) {
		
		Object.assign(this, restProps);
		
		let isEmailUpdated;
		if (email && this.email !== email) {
			this.#users.byEmail.delete(this.email);
			this.email = email;
			this.#users.byEmail.set(email, this);
			isEmailUpdated = true;
		}
		
		let isNameUpdated;
		let isLastNameUpdated;
		if (name && (this.name.first !== name.first || this.name.middle !== name.middle || this.name.last !== name.last)) {
			isLastNameUpdated = this.name.last !== name.last;
			this.name = {
				first: name.first ?? "",
				middle: name.middle ?? "",
				last: name.last ?? ""
			};
			this.initials = (((name.first?.[0] ?? "") + (name.last?.[0] ?? "")) || this.email[0]).toUpperCase();
			isNameUpdated = true;
		}
		
		if (isEmailUpdated || isNameUpdated)
			this.displayLabel = `${this.name.first} ${this.name.last}`.trim() || this.name.middle || this.email;
		
		let isRolesUpdated;
		if (ownRoleIds) {
			this.ownRoleIds = ownRoleIds;
			
			const snapshot = this.ownRoleIds.join(",");
			
			if (snapshot !== rolesSnapshots.get(this)) {
				rolesSnapshots.set(this, snapshot);
				
				if (this.#users.isInited) {
					this.updateRoles();
					isRolesUpdated = true;
				}
			}
		}
		
		let isOrgUpdated;
		if (orgId !== undefined && this.org?._id !== orgId) {
			this.org?.users.delete(this);
			this.org = orgId && this.#users.orgs.get(orgId) || this.#users.orgs.null;// eslint-disable-line @stylistic/no-mixed-operators
			this.org.users.add(this);
			isOrgUpdated = true;
		}
		
		if (avatar !== undefined && this.avatar !== avatar) {
			this.avatar = avatar;
			this.avatarUrl = avatar && `${staticUrl}/avatars/${this._id}-${avatar}.webp`;
		}
		
		if (this.#users.isInited)
			if (isRolesUpdated || isOrgUpdated) {
				this.updatePermissions();
				
				if (isLastNameUpdated)
					this.#users.isSortRequired = true;
				
				this.#users.update();
			} else if (isLastNameUpdated)
				this.#users.sort();
		
	}
	
	updateRoles() {
		
		this.ownRoles = [];
		this.roles.clear();
		this.slaveRoles.clear();
		empty(this.abilities);
		
		for (const roleId of this.ownRoleIds) {
			const role = this.#users.roles.get(roleId);
			if (role) {
				
				this.ownRoles.push(role);
				this.roles.add(role);
				for (const involvedRole of role.involves) {
					this.roles.add(involvedRole);
					this.slaveRoles.add(involvedRole);
				}
				
				this.slaveRoleIds = _ids(this.slaveRoles);
				
				this.#users.abilities.merge(this.abilities as GenericAbilities, role.abilities as GenericAbilities);
			}
		}
		
		if (this.roles.has(this.#users.roles.root))
			this.isRoot = true;
		
		void this.trimSessions();
		
	}
	
	updatePermissions() {
		
		this.slaveOrgs.clear();
		this.slaveUsers.clear();
		this.slaves.clear();
		const slaveIds = new Set<string>();
		
		for (const org of this.#users.orgs.sorted)
			if ((org.ownerUsers.has(this) || this.isRoot) && !this.slaveOrgs.has(org)) {
				this.slaveOrgs.add(org);
				this.slaves.add(org);
				slaveIds.add(org._id);
				for (const slaveOrg of org.slaveOrgs) {
					this.slaveOrgs.add(slaveOrg);
					this.slaves.add(slaveOrg);
					slaveIds.add(slaveOrg._id);
				}
			}
		
		for (const org of new Set([ this.org, ...this.slaveOrgs, this.#users.orgs.null ]))
			for (const user of org.users)
				if (user !== this && (hasAny(this.slaveRoles, user.ownRoles) || !user.ownRoles.length)) {
					this.slaveUsers.add(user);
					this.slaves.add(user);
					slaveIds.add(user._id);
				}
		
		this.slaveIds = [ ...slaveIds ];
		
		const permissiveOrgIds = [];
		if (this.org._id) {
			permissiveOrgIds.push(this.org._id);
			for (const slaveOrg of this.org.slaveOrgs)
				if (!this.slaveOrgs.has(slaveOrg))
					permissiveOrgIds.push(slaveOrg._id);
		}
		
		this.permissiveIds = [ ...permissiveOrgIds, this._id, ...slaveIds ];
		
		
		const snapshot = [
			this.permissiveIds.join(","),
			this.ownRoleIds.join(","),
			JSON.stringify(this.abilities),
			this.slaveRoleIds.join(",")
		].join("\n");
		
		if (snapshot !== permissionsSnapshots.get(this)) {
			permissionsSnapshots.set(this, snapshot);
			
			if (this.#users.isInited)
				this.#users.emit("user-permissions-change", this);
		}
		
	}
	
	trimSessions() {
		
		const sessionsLimit = this.abilities.login?.sessionsLimit ?? 0;
		
		if (this.sessions.size > sessionsLimit)
			return this.#users.sessions.collection.deleteMany({
				_id: {
					$in: _ids(
						[ ...this.sessions ]
							.sort((a, b) => a.expiresAt.valueOf() - b.expiresAt.valueOf())
							.slice(0, this.sessions.size - sessionsLimit)
					)
				}
			});
		
	}
	
	updateIsOnline() {
		
		let isOnline = false;
		
		for (const session of this.sessions)
			if (session.isOnline) {
				isOnline = true;
				break;
			}
		
		if (this.isOnline !== isOnline) {
			this.isOnline = isOnline;
			this.#users.emit("user-is-online", this);
		}
		
	}
	
	updateIsOnlineDebounced = debounce(() => this.updateIsOnline(), 500);
	
	async delete() {
		
		this.org.users.delete(this);
		
		this.#users.delete(this._id);
		this.#users.byEmail.delete(this.email);
		removeOne(this.#users.sorted, this);
		
		rolesSnapshots.delete(this);
		permissionsSnapshots.delete(this);
		
		await this.#users.replace(this._id);
		
		this.#users.update();
		
	}
	
}
