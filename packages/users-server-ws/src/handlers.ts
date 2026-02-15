import {
	_ids,
	Err,
	includesAll,
	isEmpty
} from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import {
	AbilityError,
	RolesError,
	SubordinationError,
	type AbilityParam,
	type OrgDoc,
	type RoleDoc,
	type UserDoc
} from "insite-users-server";
import { regexps } from "./regexps";
import type { UsersServer } from "./UsersServer";


export function setupHandlers<AS extends AbilitiesSchema>({ wss, users }: UsersServer<AS>) {
	
	const {
		roles,
		sessions,
		avatars,
		orgs,
		abilities
	} = users;
	
	
	/* Users */
	
	wss.onRequest("users.people.check-email", ({ user }, email: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!regexps.email.test(email))
			throw new Err("Not email", "email.not");
		
		if (users.byEmail.has(email))
			throw new Err("Email already exists", "email.exists");
		
	});
	
	wss.onRequest("users.people.create", async ({ user }, { roles: roleIds, org: orgId, ...rest }: Omit<UserDoc, "_id" | "createdAt">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!roleIds.length || !includesAll(user.slaveRoleIds, roleIds))
			throw new RolesError(roleIds);
		
		if (orgId && !user.slaveIds.includes(orgId))
			throw new SubordinationError("slaveIds", orgId);
		
		await users.create({ roles: roleIds, org: orgId, ...rest });
		
	});
	
	wss.onRequest("users.people.change-password", async ({ user }, userId: string, newPassword: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.permissiveIds.includes(userId))
			throw new SubordinationError("permissiveIds", userId);
		
		if (typeof newPassword != "string")
			throw new Err("Type of password is incorrect", "password.wrong-type");
		
		if (!newPassword)
			throw new Err("Password can't be empty", "password.empty");
		
		await users.changePassword(userId, newPassword);
		
	});
	
	wss.onRequest("users.people.update", async ({ user }, userId: string, updates: Omit<UserDoc, "_id" | "createdAt">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.permissiveIds.includes(userId))
			throw new SubordinationError("permissiveIds", userId);
		
		if (updates.roles && (!updates.roles.length || !includesAll(user.slaveRoleIds, updates.roles)))
			throw new RolesError(updates.roles);
		
		if (updates.org && !user.slaveIds.includes(updates.org))
			throw new SubordinationError("slaveIds", updates.org);
		
		if (isEmpty(updates))
			throw new Err("Empty updates", "updates.empty");
		
		await users.updateUser(userId, updates, user);
		
	});
	
	wss.onRequest("users.people.delete", async ({ user }, userId: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveIds.includes(userId))
			throw new SubordinationError("slaveIds", userId);
		
		await users.deleteUser(userId);
		
	});
	
	
	/* Sessions */
	
	wss.onRequest("users.sessions.destroy", async ({ user }, sessionId: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.permissiveIds.includes(users.bySessionId.get(sessionId)?._id))
			throw new SubordinationError("permissiveIds", users.bySessionId.get(sessionId)?._id);
		
		await sessions.destroySession(sessionId);
		
	});
	
	
	/* Avatars */
	
	wss.onTransfer?.("users.avatars.upload", {
		
		begin({ user }, { metadata: { _id, type, size } }) {
			if (!user || (user._id !== _id && !user.abilities.inSite?.users))
				throw new AbilityError();
			
			if (!user.permissiveIds.includes(_id as string))
				throw new SubordinationError("permissiveIds", _id as string);
			
			if (!avatars.TYPES_ACCEPTED.includes(type as string))
				throw new Err(`Unacceptable avatar format: ${type as string}`, "avatar.unacceptable-format");
			
			if (size as number > avatars.MAX_SIZE)
				throw new Err(`Avatar size exceeds limit of ${avatars.MAX_SIZE}: ${size as number}`, "avatar.size-exceeds-limit");
			
		},
		
		async end(_, { data, metadata: { _id, type } }) {
			await avatars.save(_id as string, type as string, data as string);
			
		}
		
	});
	
	wss.onRequest("users.avatars.delete", async ({ user }, _id: string) => {
		if (!user || (user._id !== _id && !user.abilities.inSite?.users))
			throw new AbilityError();
		
		if (!user.permissiveIds.includes(_id))
			throw new SubordinationError("permissiveIds", _id);
		
		await avatars.deleteAvatar(_id);
		
	});
	
	
	/* Orgs */
	
	wss.onRequest("users.orgs.create", async ({ user }, org: Omit<OrgDoc, "_id" | "createdAt" | "owners">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!org.title)
			throw new Err("Title can't be empty", "title.empty");
		
		await orgs.create({ ...org, owners: [ user._id ] });
		
	});
	
	wss.onRequest("users.orgs.update", async ({ user }, orgId, updates: Omit<OrgDoc, "_id" | "createdAt">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveIds.includes(orgId))
			throw new SubordinationError("slaveIds", orgId);
		
		if (updates.title === "")
			throw new Err("Title can't be empty", "title.empty");
		
		if (updates.owners && !includesAll(user.slaveIds, updates.owners))
			throw new SubordinationError("slaveIds", updates.owners);
		
		if (isEmpty(updates))
			throw new Err("Empty updates", "updates.empty");
		
		await orgs.updateOrg(orgId, updates, user);
		
	});
	
	wss.onRequest("users.orgs.delete", async ({ user }, orgId: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveIds.includes(orgId))
			throw new SubordinationError("slaveIds", orgId);
		
		await orgs.deleteOrg(orgId);
		
	});
	
	
	/* Roles */
	
	wss.onRequest("users.roles.check-id", ({ user }, roleId: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!regexps.role.test(roleId))
			throw new Err("Role ID is incorrect", "role.not-id");
		
		if (roles.has(roleId))
			throw new Err("Role ID already exists", "role.exists");
		
	});
	
	wss.onRequest("users.roles.create", async ({ user }, role: Omit<RoleDoc, "abilities" | "createdAt">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		await roles.create(role);
		
	});
	
	wss.onRequest("users.roles.update", async ({ user }, roleId: string, { abilities: _abilities, ...updates }: Omit<RoleDoc, "createdAt">) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveRoleIds.includes(roleId))
			throw new RolesError(roleId);
		
		if (updates.involves && !includesAll(user.slaveRoleIds, updates.involves))
			throw new RolesError(updates.involves);
		
		await roles.updateRole(roleId, updates);
		
	});
	
	wss.onRequest("users.roles.set-ability", async ({ user }, roleId: string, abilityLongId: string, set: boolean) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveRoleIds.includes(roleId))
			throw new RolesError(roleId);
		
		if (!abilities.hasAbility(user.abilities, abilityLongId))
			throw new AbilityError(abilityLongId);
		
		await roles.setAbility(roleId, abilityLongId, set);
		
	});
	
	wss.onRequest("users.roles.set-ability-param", async ({ user }, roleId: string, abilityLongId: string, paramId: string, value: AbilityParam) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveRoleIds.includes(roleId))
			throw new RolesError(roleId);
		
		if (!abilities.hasAbility(user.abilities, abilityLongId))
			throw new AbilityError(abilityLongId);
		
		if (!abilities.isParamFits(abilityLongId, paramId, value, abilities.getParam(user.abilities, abilityLongId, paramId)))
			throw new Err("Wrong param value", "ability.wrong-param");
		
		await roles.setAbilityParam(roleId, abilityLongId, paramId, value);
		
	});
	
	wss.onRequest("users.roles.delete", async ({ user }, roleId: string) => {
		if (!user?.abilities.inSite?.users)
			throw new AbilityError();
		
		if (!user.slaveRoleIds.includes(roleId))
			throw new RolesError(roleId);
		
		await roles.deleteRole(roleId);
		
	});
	
}
