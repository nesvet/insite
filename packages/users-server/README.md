# insite-users-server

[![npm](https://img.shields.io/npm/v/insite-users-server)](https://www.npmjs.com/package/insite-users-server)

Server-side core for users, organizations, roles, sessions, and avatars in the inSite stack. In-memory domain models backed by MongoDB with change streams for real-time sync, role-based abilities, and hierarchical org structure.

Part of [inSite](../../README.md) — uses [insite-db](../db/README.md) and [insite-common](../common/README.md). WebSocket integration via [insite-users-server-ws](../users-server-ws/README.md).

## Installation

```sh
npm install insite-users-server
```

Or:

```sh
bun add insite-users-server
```

## Overview

- **Users** — in-memory `Map<string, User>` with `byEmail`, `bySessionId`, `sorted`; login/logout, password hashing (Argon2), root user auto-creation
- **Orgs** — hierarchical organizations with owners (users or orgs), `slaveOrgs`, `null` org for users without org
- **Roles** — role hierarchy with `involves`, merged abilities, `root` role
- **Sessions** — TTL (7 days), `isOnline`, prolong, `uid()` for session IDs
- **Avatars** — WebP storage in `users.avatars` collection, base64 save
- **Abilities** — schema-driven permissions via `AbilitiesMap`, merge from roles, params (number/items)

## Setup

```ts
import { Users } from "insite-users-server";
import type { Collections } from "insite-db";
import type { AbilitiesSchema } from "insite-common";

const users = await Users.init(collections, {
	abilities: yourAbilitiesSchema,
	// optional: indexes, schema, initialRoot, roles, orgs, sessions, avatars, collection
});

// or with constructor:
const usersInstance = new Users(collections, options);
await usersInstance.whenReady();
```

**Options<AS>:**

| Option | Type | Description |
|--------|------|-------------|
| `abilities` | `AS` | Abilities schema from [insite-common](../common/README.md) |
| `indexes` | `CollectionIndexes` | Additional MongoDB indexes for users |
| `schema` | `CollectionSchema` | Custom schema extensions for users |
| `initialRoot` | `Partial<UserDoc>` | Props for auto-created root user |
| `roles` | `RolesOptions` | Roles collection config |
| `orgs` | `OrgsOptions` | Orgs collection config |
| `sessions` | `SessionsOptions` | Sessions collection config |
| `avatars` | `AvatarsOptions` | Avatars collection config |
| `collection` | `CollectionOptions` | Base collection options |

**Events:** `user-create`, `user-is-online`, `user-permissions-change`, `session-delete`

## Public API

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `Users` | class | Main entry, extends `Map<string, User>` |
| `User` | class | User entity |
| `UserDoc`, `Options`, `AvatarDoc` | types | User-related types |
| `Org`, `OrgDoc`, `Orgs` | types | Org-related |
| `Role`, `RoleDoc`, `Roles` | types | Role-related |
| `Session`, `SessionDoc`, `Sessions` | types | Session-related |
| `AbilitiesMap`, `AbilityBoolean`, `AbilityParam`, `AbilityParamItems`, `AbilityParamNumber`, `AbilityWithParams`, `GenericAbilities` | types | Abilities |
| `PermissionError`, `SubordinationError`, `UnauthorizedError` | classes | User errors |
| `RolesError`, `AbilityError` | classes | Role/ability errors |

---

### Users

```ts
class Users<AS extends AbilitiesSchema> extends Map<string, User<AS>>
```

| Method | Description |
|--------|-------------|
| `constructor(collections, options)` | Creates instance, starts async init |
| `static init(collections, options)` | Factory, returns `Promise<Users>` |
| `whenReady()` | Returns `Promise<Users>` for init completion |
| `load(userDoc)` | Loads user from doc into map |
| `create(newUser)` | Creates user, returns `_id` |
| `updateUser(_id, updates, byUser?)` | Updates user; `byUser` restricts role changes by subordination |
| `changePassword(_id, newPassword)` | Hashes and updates password, invalidates sessions |
| `login(email, password, sessionProps)` | Verifies credentials, creates session |
| `logout(session)` | Deletes session |
| `deleteUser(_id)` | Deletes user from collection |
| `sortIds(ids)` | Sorts ids by user/org display order |
| `replace(fromId)` | Runs replace handlers (e.g. merge user) |

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<UserDoc>` | Users MongoDB collection |
| `roles` | `Roles<AS>` | Roles manager |
| `sessions` | `Sessions<AS>` | Sessions manager |
| `orgs` | `Orgs<AS>` | Orgs manager |
| `avatars` | `Avatars` | Avatars manager |
| `abilities` | `AbilitiesMap<AS>` | Abilities schema map |
| `byEmail` | `Map<string, User<AS>>` | Lookup by email |
| `bySessionId` | `Map<string, User<AS>>` | Lookup by session id |
| `sorted` | `User<AS>[]` | Users sorted by last name |
| `replaceMap` | `Map<string, string>` | Map fromId → toId for replace |
| `replaceHandlers` | `Set<(fromId, toId) => void \| Promise<void>>` | Handlers for `replace()` |

---

### User

```ts
class User<AS extends AbilitiesSchema>
```

| Property | Type | Description |
|----------|------|-------------|
| `_id` | `string` | User id |
| `email` | `string` | Email |
| `name` | `{ first, middle, last }` | Name parts |
| `initials` | `string` | First letters of first/last name |
| `displayLabel` | `string` | Display name (first + last or email) |
| `org` | `Org<AS>` | Organization |
| `job` | `string` | Job title |
| `avatar` | `string \| null` | Avatar timestamp id |
| `avatarUrl` | `string \| null` | Full avatar URL |
| `roles` | `Set<Role<AS>>` | All roles (own + inherited) |
| `ownRoles` | `Role<AS>[]` | Direct roles |
| `ownRoleIds` | `string[]` | Direct role ids |
| `slaveRoles` | `Set<Role<AS>>` | Inherited roles |
| `slaveRoleIds` | `string[]` | Inherited role ids |
| `abilities` | `Abilities<AS>` | Merged abilities from roles |
| `slaveOrgs` | `Set<Org<AS>>` | Orgs user owns |
| `slaveUsers` | `Set<User<AS>>` | Users in subordination |
| `slaves` | `Set<Org<AS> \| User<AS>>` | Union of slaveOrgs and slaveUsers |
| `slaveIds` | `string[]` | Ids of slaves |
| `permissiveIds` | `string[]` | Ids user can act on (org, self, slaves) |
| `sessions` | `Set<Session<AS>>` | Active sessions |
| `isOnline` | `boolean` | Has at least one online session |
| `isRoot` | `boolean` | Has root role |

---

### Orgs

```ts
class Orgs<AS extends AbilitiesSchema> extends Map<string, Org<AS>>
```

| Method | Description |
|--------|-------------|
| `create(newOrg)` | Creates org, returns `_id` |
| `updateOrg(_id, updates, byUser?)` | Updates org; `byUser` restricts owner changes |
| `deleteOrg(org)` | Removes org from owners, deletes org |
| `load(orgDoc)` | Loads org from doc |
| `replace(fromId)` | Runs replace handlers |

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<OrgDoc>` | Orgs collection |
| `null` | `Org<AS>` | Virtual org for users without org |
| `sorted` | `Org<AS>[]` | Orgs in hierarchy order |
| `replaceMap` | `Map<string, string>` | Replace mapping |
| `replaceHandlers` | `Set<(fromId, toId) => void \| Promise<void>>` | Replace handlers |

---

### Org

```ts
class Org<AS extends AbilitiesSchema>
```

| Property | Type | Description |
|----------|------|-------------|
| `_id` | `string` | Org id |
| `title` | `string` | Org title |
| `initials` | `string` | First letter of title |
| `displayLabel` | `string` | Same as title |
| `ownerOrgs` | `Set<Org<AS>>` | Parent orgs |
| `ownerUsers` | `Set<User<AS>>` | Owner users |
| `users` | `Set<User<AS>>` | Users in this org |
| `slaveOrgs` | `Set<Org<AS>>` | Child orgs |
| `ownerIds` | `string[]` | Owner ids (users or orgs) |

| Method | Description |
|--------|-------------|
| `delete()` | Deletes org via Orgs |

---

### Roles

```ts
class Roles<AS extends AbilitiesSchema> extends Map<string, Role<AS>>
```

| Method | Description |
|--------|-------------|
| `create(newRole)` | Creates role, returns `_id` |
| `updateRole(roleId, updates)` | Updates role (excludes abilities) |
| `deleteRole(role)` | Removes from involves, deletes role |
| `setAbility(roleId, abilityLongId, set)` | Enables/disables ability |
| `setAbilityParam(roleId, abilityLongId, paramId, value)` | Sets ability param |
| `cleanUpIds(ids)` | Removes redundant role ids (e.g. if A involves B, removes A when B requested) |
| `load(roleDoc)` | Loads role from doc |

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<RoleDoc>` | Roles collection |
| `root` | `Role<AS>` | Root role |
| `sorted` | `Role<AS>[]` | Roles in hierarchy order |

---

### Role

```ts
class Role<AS extends AbilitiesSchema>
```

| Property | Type | Description |
|----------|------|-------------|
| `_id` | `string` | Role id |
| `ownInvolveIds` | `string[]` | Direct role ids this involves |
| `ownAbilities` | `Abilities<AS>` | Direct abilities |
| `title` | `string` | Role title |
| `displayTitle` | `string` | Title or id |
| `ownInvolves` | `Role<AS>[]` | Direct involved roles |
| `involves` | `Set<Role<AS>>` | All involved roles (transitive) |
| `abilities` | `Abilities<AS>` | Merged abilities |
| `inheritedAbilities` | `Abilities<AS>` | From involved roles |

---

### Sessions

```ts
class Sessions<AS extends AbilitiesSchema> extends Map<string, Session<AS>>
```

| Method | Description |
|--------|-------------|
| `uid()` | Generates session id (ObjectId~base64url) |
| `create(user, props)` | Creates session for user |
| `destroySession(_id)` | Deletes session |
| `load(sessionDoc)` | Loads session from doc |

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<SessionDoc>` | Sessions collection (TTL 7 days) |

---

### Session

```ts
class Session<AS extends AbilitiesSchema>
```

| Property | Type | Description |
|----------|------|-------------|
| `_id` | `string` | Session id |
| `user` | `User<AS>` | User |
| `isOnline` | `boolean` | Online flag |
| `userAgent` | `string` | User agent |
| `remoteAddress` | `string` | IP |
| `createdAt` | `number` | Timestamp |
| `prolongedAt` | `number` | Last prolong timestamp |
| `expiresAt` | `Date` | Expiry |

| Method | Description |
|--------|-------------|
| `prolong(updates)` | Extends expiry, updates fields |
| `online()` | Sets isOnline true |
| `offline()` | Sets isOnline false |
| `delete()` | Removes from map and collection |

---

### Avatars

```ts
class Avatars
```

| Method | Description |
|--------|-------------|
| `save(_id, type, data)` | Saves base64 data (expects `image/webp`), updates user.avatar |
| `deleteAvatar(_id)` | Deletes avatar, clears user.avatar |

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<AvatarDoc>` | Avatars collection |
| `TYPES_ACCEPTED` | `string[]` | `["image/webp"]` |
| `MAX_SIZE` | `number` | 512 KB |

---

### AbilitiesMap

```ts
class AbilitiesMap<AS extends AbilitiesSchema> extends Map<string, AbilitySchema>
```

| Method | Description |
|--------|-------------|
| `get(longId, parent?)` | Gets ability schema by long id (e.g. `"users.edit"`) |
| `getParamSchema(longId, paramId)` | Gets param schema |
| `getDefaultParam(longId, paramId, max?)` | Default value for param |
| `getDefaultAbility(schema, max?)` | Default ability object |
| `getDefaultAbilities(schemas?, max?)` | Full default abilities |
| `getSchemeFor(abilities)` | Returns schema filtered to given abilities |
| `getParam(abilities, longId, paramId)` | Gets param value or default |
| `setParam(abilities, longId, paramId, value)` | Sets param, returns abilities |
| `isParamFits(longId, paramId, value, referenceValue?)` | Validates param |
| `adjustParam(paramSchema, value)` | Clamps/validates param value |
| `adjust(abilities, parent?)` | Normalizes abilities to schema |
| `merge(target, source, parent?)` | Merges source into target |
| `hasAbility(abilities, longId)` | Checks if ability is set |
| `setAbility(target, longId)` | Enables ability |
| `unsetAbility(target, longId)` | Disables ability |

---

### Errors

| Class | Constructor | `name` |
|-------|-------------|--------|
| `UnauthorizedError` | `(payload?)` | `"UnauthorizedError"` |
| `SubordinationError` | `(payload?)` or `(type, payload?)` or `(type, ids, payload?)` — type: `"_id" \| "permissiveIds" \| "slaveIds"` | `"SubordinationError"` |
| `PermissionError` | `(payload?)` | `"PermissionError"` |
| `RolesError` | `(roleId, payload?)` or `(roleIds[], payload?)` | `"RolesError"` |
| `AbilityError` | `(payload?)` or `(longId, payload?)` | `"AbilityError"` |

All extend `Err` from `@nesvet/n` with `code` and `payload`.

---

## Types Reference

| Type | Description |
|------|-------------|
| `UserDoc` | `{ _id, email, password, roles, name, org, job, avatar?, meta, createdAt }` |
| `NewUser` | UserDoc minus _id, createdAt; name partial |
| `Options<AS>` | Users init options |
| `OrgDoc` | `{ _id, title, note, owners, meta, createdAt }` |
| `NewOrg` | OrgDoc minus _id, createdAt |
| `OrgsOptions` | Orgs config |
| `SessionDoc` | `{ _id, user, userAgent, remoteAddress, isOnline, meta, createdAt, prolongedAt, expiresAt }` |
| `SessionsOptions` | Sessions config |
| `RoleDoc` | `{ _id, involves, abilities, title, description, meta, createdAt }` |
| `NewRole` | RoleDoc minus abilities, createdAt |
| `RolesOptions` | Roles config |
| `AvatarDoc` | `{ _id, type, size, ts, data, meta }` |
| `AvatarsOptions` | Avatars config |
| `AbilityParam` | `AbilityParamItems \| AbilityParamNumber` |
| `AbilityParamItems` | `string[]` |
| `AbilityParamNumber` | `number` |
| `AbilityWithParams` | `Record<string, AbilityParam>` |
| `AbilityObject` | `Record<string, Ability \| AbilityParam>` |
| `AbilityBoolean` | `true` |
| `Ability` | `AbilityBoolean \| AbilityObject` |
| `GenericAbilities` | `Record<string, Ability>` |

---

## Related

- [insite-db](../db/README.md), [insite-common](../common/README.md), [insite-users-server-ws](../users-server-ws/README.md)

## License

MIT
