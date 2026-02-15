# insite-users-client

Client-side library for users, organizations, and roles in inSite. Subscribes to publications over WebSocket and wires data into reactive structures (orgs, users, current user) with automatic cross-linking and sync.

Part of [inSite](../../README.md) — requires [insite-ws](../ws/README.md) and [insite-subscriptions-client](../subscriptions-client/README.md).

## Installation

```sh
npm install insite-users-client
```

Or:

```sh
bun add insite-users-client
```

## Setup

Before using this package, bind the subscription protocol to your WebSocket instance:

```ts
import { WS } from "insite-ws/client";
import { Subscription } from "insite-subscriptions-client";

const ws = new WS({ url: "wss://example.com" });
Subscription.bindTo(ws);
```

`Subscription.bindTo(ws)` wires subscriptions to the given `WS` instance. Without it, creating a `UsersSubscriptionGroup` will throw.

## Overview

**UsersSubscriptionGroup** — Main class extending `SubscriptionGroup`. Manages three base subscriptions: `orgs`, `users`, and `user` (current user). Optionally extends to `roles`, `extendedUsers`, and `extendedOrgs` for role-based and hierarchical data.

**Types** — `User`, `Org`, `Role`, `CurrentUser`, `Orgs`, `Users`, `Roles` and their extended variants describe the data shapes.

## Basic Usage

```ts
import { UsersSubscriptionGroup } from "insite-users-client";

const target = { orgs: null, users: null, user: null };
const group = new UsersSubscriptionGroup({ target });

group.on("load", (values) => {
	console.log("Loaded:", values.orgs, values.users, values.user);
});

// Optional: load roles and extended org/user data
group.extend().then(() => {
	console.log("Extended:", target.orgs.sortedHierarchically, target.users);
});
```

## Public API

### Exports

| Export | Description |
|--------|-------------|
| `UsersSubscriptionGroup` | Class for managing users-related subscriptions |
| `CurrentUser`, `NullOrg`, `Org`, `OrgExtended`, `Orgs`, `OrgsExtended` | Types |
| `Role`, `Roles` | Types |
| `User`, `UserExtended`, `Users`, `UsersExtended` | Types |
| `UsersSubscriptionGroupOptions` | Constructor options type |

---

### UsersSubscriptionGroup

Extends `SubscriptionGroup` from [insite-subscriptions-client](../subscriptions-client/README.md). Manages subscriptions to `orgs`, `users`, `user`, and optionally `roles`, `users.extended`, `orgs.extended`.

#### Constructor

```ts
new UsersSubscriptionGroup(options: UsersSubscriptionGroupOptions)
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `values` | `{ orgs?, users?, user? }` | Pre-created subscription containers (defaults to new maps/object) |
| `target` | `object` | Object to bind values to (`target.orgs`, `target.users`, `target.user`) |
| `debounce` | `number` | Debounce ms for `update` events (default: 8) |
| `immediately` | `boolean` | Subscribe immediately on attach (default `true`) |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `values` | `{ orgs, users, user }` | Subscription values (maps/object) |
| `items` | `Record<string, SubscriptionGroupItem>` | Per-subscription items |
| `isLoaded` | `boolean` | `true` when all base subscriptions loaded |
| `isInited` | `boolean` | `true` when all subscriptions inited |
| `isExtended` | `boolean \| null` | `false` = base only, `null` = extending, `true` = extended |
| `target` | `object \| undefined` | Bound target object |
| `emitUpdate` | `() => void` | Emits debounced `update` event |

#### Methods

| Method | Description |
|--------|-------------|
| `extend()` | Attaches `roles`, `extendedUsers`, `extendedOrgs`. Returns `Promise<void>` or `undefined` if already extended/extending |
| `unextend()` | Detaches extended subscriptions |
| `loaded()` | Returns `StatefulPromise` resolving when all items loaded |
| `inited()` | Returns `StatefulPromise` resolving when all items inited |
| `unloaded()` | Returns `StatefulPromise` resolving when all items unloaded |
| `subscribe()` | Subscribes all items |
| `unsubscribe()` | Unsubscribes all items |
| `attach(definitions, shouldReload?, immediately?)` | Attach definitions (inherited) |
| `detach(names, shouldUpdate?)` | Detach subscriptions by name (inherited) |
| `redefine(definitions)` | Replace definitions (inherited) |
| `applyOptions({ target?, debounceLimit? })` | Update target or debounce (inherited) |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `load` | `values` | All base subscriptions loaded |
| `init` | `values` | All subscriptions inited |
| `unload` | `values` | All subscriptions unloaded |
| `update` | `values` | Data changed (debounced) |
| `update.{name}` | — | Specific subscription updated |

---

### Types

#### User

```ts
type User = {
	_id: string;
	isUser: true;
	email: string;
	name: { first: string; middle: string; last: string };
	orgId: string;
	job: string;
	initials: string;
	displayLabel: string;
	avatarUrl: string;
	isOnline: boolean;
	org: NullOrg | Org;
};
```

#### UserExtended

`User` with optional `roles?: Role[]`.

#### CurrentUser\<AS\>

`UserExtended` plus:

| Field | Type | Description |
|-------|------|-------------|
| `abilities` | `Abilities<AS>` | Typed abilities from schema (from `insite-common`) |
| `sessionId` | `string \| undefined` | Session identifier |
| `slaveIds` | `string[]` | IDs of subordinate orgs/users |
| `slavesSnapshot` | `string` | Cached join of `slaveIds` |
| `slaves` | `(Org \| User)[]` | Resolved slave entities |
| `slaveUsers` | `User[]` | Slaves that are users |
| `slaveOrgs` | `Org[]` | Slaves that are orgs |

`AS` extends `AbilitiesSchema` from [insite-common](../common/README.md); omit for default schema.

#### Org

```ts
type Org = {
	_id: string;
	title: string;
	initials: string;
	displayLabel: string;
	isOrg: true;
	users: Set<User> & { sorted: User[] };
};
```

#### NullOrg

`Org` with `_id: null`. Used for users without an organization (`orgs.null`).

#### OrgExtended

`Org` plus optional: `owners?: (OrgExtended | User)[]`, `slaveOrgs?: OrgExtended[]`, `note?: string`, `_l?: number`.

#### Role

```ts
type Role = {
	_id: string;
	ownInvolves: Role[];
	involves: Role[];
	_l: number;
};
```

#### Orgs

`SubscriptionMapWithSubscription<Org>` plus `null: NullOrg`. Keys are org IDs; `orgs.null` holds users without org.

#### OrgsExtended

`Orgs` with `OrgExtended` items, plus `sortedHierarchically?: OrgExtended[]`.

#### Users

`SubscriptionMapWithSubscription<User>`. Keys are user IDs.

#### UsersExtended

`SubscriptionMapWithSubscription<UserExtended>`.

#### Roles

`SubscriptionMapWithSubscription<Role>`.

#### UsersSubscriptionGroupOptions

```ts
type UsersSubscriptionGroupOptions = SubscriptionGroupOptions & {
	values?: {
		orgs?: SubscriptionMapWithSubscription;
		users?: SubscriptionMapWithSubscription;
		user?: SubscriptionObjectWithSubscription;
	};
};
```

Extends `SubscriptionGroupOptions` (`target`, `debounce`, `immediately`) from [insite-subscriptions-client](../subscriptions-client/README.md).

---

## Subscriptions

| Name | Publication | Type | Description |
|------|--------------|------|-------------|
| `orgs` | `orgs` | map | Organizations |
| `users` | `users` | map | Users |
| `user` | `user` | object | Current user (params: `[true]`) |
| `roles` | `roles` | map | Roles (extended only) |
| `extendedUsers` | `users.extended` | map | User extensions with roles (extended only) |
| `extendedOrgs` | `orgs.extended` | map | Org extensions with owners, slaveOrgs (extended only) |

---

## Related

- [insite-ws](../ws/README.md), [insite-subscriptions-client](../subscriptions-client/README.md), [insite-common](../common/README.md)
- [insite-users-server-ws](../users-server-ws/README.md) — server counterpart
- [insite-client](../client/README.md) — includes UsersSubscriptionGroup

## License

MIT
