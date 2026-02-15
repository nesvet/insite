# insite-users-server-ws

WebSocket layer for the inSite users stack. Wires [insite-users-server](../users-server/README.md) (users, orgs, roles, sessions, avatars) to a WebSocket server ([insite-ws](../ws/README.md)).

Part of [inSite](../../README.md) — depends on [insite-users-server](../users-server/README.md), [insite-ws](../ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-ws-transfers](../ws-transfers/README.md).

## Installation

```sh
npm install insite-users-server-ws
```

Or:

```sh
bun add insite-users-server-ws
```

## Overview

The package bridges the users domain to WebSocket. It provides:

- **Login/logout** — request handlers for `login` and `logout`
- **Publications** — real-time subscriptions for abilities, roles, users, orgs, sessions (via [insite-subscriptions-server](../subscriptions-server/README.md))
- **Request handlers** — CRUD for users, orgs, roles, sessions, avatars
- **Transfer handler** — avatar upload via [insite-ws-transfers](../ws-transfers/README.md)
- **Session binding** — `setSession()` to attach/detach sessions to WebSocket clients; emits `client-session` and `should-renew-subscriptions`

Publications are created internally by `UsersServer` and are not exported. You configure them through options.

## Setup

```ts
import { UsersServer } from "insite-users-server-ws";
import type { AbilitiesSchema } from "insite-common";
import type { Collections } from "insite-db";
import type { WSServer } from "insite-ws/server";
import type { WSSCWithUser } from "insite-users-server-ws";

const usersServer = await UsersServer.init<AbilitiesSchema>({
	wss: yourWss as WSServer<WSSCWithUser<AbilitiesSchema>>,
	collections,
	users: { abilities: yourAbilitiesSchema },
	publication: { projection: { email: 1, name: 1 } },
	userPublication: { public: false }
});

// or with constructor:
const usersServer = new UsersServer(options);
await usersServer.whenReady();
```

**Options<AS>:**

| Option | Type | Description |
|--------|------|-------------|
| `wss` | `WSServer<WSSCWithUser<AS>>` | WebSocket server (with optional `onTransfer` for avatar upload) |
| `collections` | `Collections` | MongoDB collections (required if `users` is `UsersOptions`) |
| `users` | `Users<AS>` \| `UsersOptions<AS>` | Users instance or options to init |
| `public` | `boolean` | If true, only `user` publication is created; no admin handlers |
| `publication` | `UsersPublicationOptions` | Options for `users` publication |
| `extendedPublication` | `UsersExtendedPublicationOptions` | Options for `users.extended` publication |
| `userPublication` | `UserPublicationOptions` | Options for `user` publication |
| `roles` | `{ publication?: RolesPublicationOptions }` | Roles publication options |
| `orgs` | `{ publication?: OrgsPublicationOptions; extendedPublication?: OrgsExtendedPublicationOptions }` | Orgs publication options |
| `incomingTransport` | `IncomingTransport<WSSCWithUser<AS>>` | Transport for binary transfers (avatar upload) |

## WSS Integration

**Expected WSS type:** `WSServer<WSSCWithUser<AS>>` with optional `onTransfer` for avatar upload.

**Events the package listens to:**

| Event | Description |
|-------|-------------|
| `client-close` | Client disconnected; session is marked offline and unbound |

**Events the package emits:**

| Event | Args | Description |
|-------|------|-------------|
| `client-session` | `(wssc, shouldProlong?)` | Session was set or cleared on the client |
| `should-renew-subscriptions` | `(wsscs: WSSCWithUser[])` | User permissions changed; clients should renew subscriptions |

## Public API

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `UsersServer` | class | Main entry |
| `WSSCWithUser` | class | WebSocket client with user/session |
| `Options` | type | Constructor options |
| `UsersServerWithActualProps` | type | Typed instance; omits admin publications when `public: true` |

---

### UsersServer

```ts
class UsersServer<AS extends AbilitiesSchema>
```

**Constructor:** `new UsersServer(options: Options<AS>)`

**Static method:** `UsersServer.init<IAS, IO, IUS>(options: IO): Promise<OmitRedundant<IUS, IO>>` — creates instance and returns `whenReady()`.

**Instance properties:**

| Property | Type | When present |
|----------|------|--------------|
| `wss` | `Options["wss"]` | Always |
| `users` | `Users<AS>` | Always |
| `incomingTransport` | `Options["incomingTransport"]` | Always |
| `abilitiesPublication` | `AbilitiesPublication<AS>` | When `public !== true` |
| `rolesPublication` | `RolesPublication<AS>` | When `public !== true` |
| `usersPublication` | `UsersPublication<AS>` | When `public !== true` |
| `usersExtendedPublication` | `UsersExtendedPublication<AS>` | When `public !== true` |
| `userPublication` | `UserPublication<AS>` | Always |
| `orgsPublication` | `OrgsPublication<AS>` | When `public !== true` |
| `orgsExtendedPublication` | `OrgsExtendedPublication<AS>` | When `public !== true` |
| `sessionsPublication` | `SessionsPublication<AS>` | When `public !== true` |

**Methods:**

| Method | Description |
|--------|-------------|
| `whenReady(): Promise<this>` | Resolves when init is complete |
| `setSession(wssc, session, shouldProlong?): void` | Binds or unbinds session to client. `session` can be `Session`, session ID string, `null`, or `undefined`. If `shouldProlong` is true, prolongs the session. Emits `client-session`. |

---

### WSSCWithUser

```ts
class WSSCWithUser<AS extends AbilitiesSchema> extends WSServerClient
```

Extends `WSServerClient` from [insite-ws](../ws/README.md).

| Property | Type | Description |
|----------|------|-------------|
| `isRejected` | `boolean` | Client was rejected (e.g. auth failed) |
| `sessionProps` | `Partial<SessionDoc>` | Custom session props (userAgent, remoteAddress, etc.) |
| `user` | `User<AS>` | Current user (when session is set) |
| `lastUserId` | `string` | Last user ID (for reconnection scenarios) |
| `session` | `Session<AS>` | Current session |

---

### Options

```ts
type Options<AS extends AbilitiesSchema> = {
	wss: WithOptionalOnTransfer<WSServer<WSSCWithUser<AS>>, WSSCWithUser<AS>>;
	collections?: Collections;
	public?: boolean;
	users: Users<AS> | UsersOptions<AS>;
	publication?: UsersPublicationOptions;
	extendedPublication?: UsersExtendedPublicationOptions;
	userPublication?: UserPublicationOptions;
	roles?: { publication?: RolesPublicationOptions };
	orgs?: {
		publication?: OrgsPublicationOptions;
		extendedPublication?: OrgsExtendedPublicationOptions;
	};
	incomingTransport?: IncomingTransport<WSSCWithUser<AS>>;
};
```

Publication option types are defined in [insite-subscriptions-server](../subscriptions-server/README.md) and insite-users-server-ws (internal). Key fields:

- **UsersPublicationOptions:** `projection`, `sort`, `transform`
- **UsersExtendedPublicationOptions:** `projection`, `sort`, `triggers`, `transform`
- **UserPublicationOptions:** `fieldsToUpdate`, `projection`, `transform`, `public`
- **RolesPublicationOptions:** `projection`, `sort`, `transform`
- **OrgsPublicationOptions:** `projection`, `sort`, `transform`
- **OrgsExtendedPublicationOptions:** `projection`, `sort`, `triggers`, `transform`

## Request Handlers

`login` and `logout` are always registered. The rest are registered only when `public !== true`. First argument is always `{ user }` from `WSSCWithUser`; subsequent args are from the client.

| Method | Args | Description |
|--------|------|-------------|
| `login` | `(email, password)` | Authenticates and binds session to client |
| `logout` | `()` | Logs out and unbinds session |
| `users.people.check-email` | `(email)` | Checks if email is available |
| `users.people.create` | `(userDoc)` | Creates user |
| `users.people.change-password` | `(userId, newPassword)` | Changes user password |
| `users.people.update` | `(userId, updates)` | Updates user |
| `users.people.delete` | `(userId)` | Deletes user |
| `users.sessions.destroy` | `(sessionId)` | Destroys session |
| `users.avatars.delete` | `(_id)` | Deletes avatar |
| `users.orgs.create` | `(org)` | Creates org |
| `users.orgs.update` | `(orgId, updates)` | Updates org |
| `users.orgs.delete` | `(orgId)` | Deletes org |
| `users.roles.check-id` | `(roleId)` | Checks if role ID is available |
| `users.roles.create` | `(role)` | Creates role |
| `users.roles.update` | `(roleId, updates)` | Updates role |
| `users.roles.set-ability` | `(roleId, abilityLongId, set)` | Sets ability on role |
| `users.roles.set-ability-param` | `(roleId, abilityLongId, paramId, value)` | Sets ability param |
| `users.roles.delete` | `(roleId)` | Deletes role |

## Transfer Handler

When `wss.onTransfer` is available, the package registers:

| Transfer | Metadata | Description |
|----------|----------|-------------|
| `users.avatars.upload` | `{ _id, type, size }` | Avatar upload. `_id` is user ID; `type` must be in accepted formats (e.g. WebP); `size` must not exceed limit. |

## Publications

Publications are created internally. Clients subscribe via the subscription protocol (see [insite-subscriptions-server](../subscriptions-server/README.md)). Names and purpose:

| Name | Purpose |
|------|---------|
| `abilities` | Abilities scheme for the current user (roles view) |
| `roles` | Roles the user can manage |
| `user` | Current user (self) |
| `users` | All users (list view) |
| `users.extended` | Extended user data for subordinates |
| `users.people.sessions` | Sessions for a given user |
| `orgs` | All orgs |
| `orgs.extended` | Extended org data for subordinates |

## Related

- [insite-users-server](../users-server/README.md), [insite-ws](../ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-ws-transfers](../ws-transfers/README.md)
- [insite-users-client](../users-client/README.md) — client counterpart
- [insite-cookie](../cookie/README.md) — cookie auth integration

## License

MIT
