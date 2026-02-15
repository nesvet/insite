# insite-subscriptions-client

[![npm](https://img.shields.io/npm/v/insite-subscriptions-client)](https://www.npmjs.com/package/insite-subscriptions-client)

Client-side library for subscribing to inSite publications over WebSocket. Provides reactive containers for three data shapes — object, array, and map — that apply server updates and notify your handlers.

Part of [inSite](../../README.md) — requires [insite-ws](../ws/README.md). Pairs with [insite-subscriptions-server](../subscriptions-server/README.md).

## Installation

```sh
npm install insite-subscriptions-client
```

Or:

```sh
bun add insite-subscriptions-client
```

## Setup

Before creating any subscriptions, bind the library to your WebSocket instance:

```ts
import { WS } from "insite-ws/client";
import { Subscription } from "insite-subscriptions-client";

const ws = new WS({ url: "wss://example.com" });
Subscription.bindTo(ws);
```

`Subscription.bindTo(ws)` wires the subscription protocol to the given `WS` instance. Without it, creating subscriptions will throw.

## Core Concepts

**Subscription** — Low-level subscription. Sends `s-s` (subscribe) and `s-u` (unsubscribe) messages, receives `s-c` (changed) updates. You typically use the higher-level containers instead.

**SubscriptionObject**, **SubscriptionArray**, **SubscriptionMap** — Reactive containers. Each applies incoming updates to its data and invokes an optional `handleUpdate` callback. Can be used standalone (you feed updates manually) or with built-in subscription.

**WithSubscription variants** — Combine container + subscription. `SubscriptionObjectWithSubscription`, `SubscriptionArrayWithSubscription`, `SubscriptionMapWithSubscription` subscribe on creation and feed updates into the container.

**SubscriptionGroup** — Manages multiple subscriptions with shared lifecycle (load, init, unload). Supports target binding (assign values to an object), debounced updates, and definition-based configuration.

## Public API

### Subscription

```ts
Subscription.bindTo(ws: WS): void
```

Binds all subscriptions to the given WebSocket. Call once before creating any subscription.

```ts
new Subscription(
	type: "array" | "map" | "object",
	publicationName: string,
	args?: unknown[],
	handler?: (updates: unknown) => void,
	immediately?: boolean
)
```

| Property | Description |
|----------|-------------|
| `i` | Internal subscription id |
| `type` | `"array"` \| `"map"` \| `"object"` |
| `publicationName` | Publication name to subscribe to |
| `args` | Arguments passed to the publication |
| `handler` | Called when updates arrive |
| `immediately` | Request initial data on subscribe (default `true`) |
| `isActive` | `true` when data is loaded, `false` when connection is closed |

| Method | Description |
|--------|-------------|
| `cancel()` | Unsubscribes and removes the subscription |
| `start` | Sends subscribe message (called on reconnect) |

---

### SubscriptionObject

Plain object container. Updates merge into the object; `null` clears it.

```ts
new SubscriptionObject(updates?: Updates, onUpdate?: UpdateHandler)
SubscriptionObject.WithSubscription(publicationName: string, params: unknown[], onUpdate: UpdateHandler, immediately?: boolean)
```

**Types:**

- `Updated` — `Record<string, unknown>` (the current object state)
- `Updates` — `Record<string, unknown> | null` (incoming update payload)
- `UpdateHandler` — `(object, updated, updates) => void`

**Methods (via symbols):** `update`, `clear`, `getAsUpdates`, `getAsInitialUpdated`, `getHandleUpdate` / `setHandleUpdate`

---

### SubscriptionArray

Array container. Supports add, delete, initial load, and optional sort direction.

```ts
new SubscriptionArray<I>(updates?: Updates<I>, onUpdate?: UpdateHandler<I>)
SubscriptionArray.WithSubscription(publicationName: string, params: unknown[], onUpdate: UpdateHandler<I>, immediately?: boolean)
```

**Types:**

- `Updated<I>` — `I[]` with `added: I[]` and `deleted: I[]`
- `Updates<I>` — Array of `["i", items[], sort?] | ["a", item] | ["d", item] | null`
- `UpdateHandler<I>` — `(array, updated, updates) => void`

**Properties:** `sorted`, `sortDirection` (-1 | 0 | 1), `sortCompareFunction`, `handleUpdate`

**Methods:** `update`, `clear`, `getAsUpdates`, `getAsInitialUpdated`. WithSubscription adds `subscribe`, `unsubscribe`, `renew`

---

### SubscriptionMap

Map container keyed by `_id`. Supports create, update, delete, initial load, and multi-field sorting.

```ts
new SubscriptionMap<I>(updates?: Updates<I>, onUpdate?: UpdateHandler<I>)
SubscriptionMap.WithSubscription(publicationName: string, params: unknown[], onUpdate: UpdateHandler<I>, immediately?: boolean)
```

**Types:**

- `Updated<I>` — `I[]` with `added: I[]` and `deleted: string[]` (ids)
- `Updates<I>` — Array of `["i", items[], sortList?] | ["c", item] | ["u", item, fields] | ["d", _id] | null`
- `UpdateHandler<I>` — `(map, updated, updates) => void`
- `SubscriptionMapItem` — Base class for custom map items (has `_id`, `update`, `delete`)

**Properties:** `sorted`, `sortList`, `sortCompareFunction`, `handleUpdate`, `Item` (setter for custom item class)

**Methods:** `update`, `clear`, `getAsUpdates`, `getAsInitialUpdated`, `sort`. WithSubscription adds `subscribe`, `unsubscribe`, `renew`

**Custom items:** Set `map.Item = MyItemClass` before or after first update. `MyItemClass` receives `(map, updates)` in constructor and must have `_id`.

---

### SubscriptionGroup

Manages multiple subscriptions with shared lifecycle and optional target binding.

```ts
new SubscriptionGroup(definitions, options?)
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `target` | object | Object to bind subscription values to (`target[name] = value`) |
| `debounce` | number | Debounce ms for `update` events (default: `SubscriptionGroup.debounceLimit` = 8) |
| `immediately` | boolean | Subscribe immediately on attach (default `true`) |

**Methods:**

| Method | Description |
|--------|-------------|
| `attach(definitions, shouldReload?, immediately?)` | Attach definitions, returns `Promise` of load |
| `detach(names, shouldUpdate?)` | Detach subscriptions by name |
| `redefine(definitions)` | Replace definitions, reattach changed, detach removed |
| `subscribe()` | Subscribe all items |
| `unsubscribe()` | Unsubscribe all items |
| `applyOptions({ target?, debounceLimit? })` | Update target or debounce |
| `loaded()` | Returns `StatefulPromise` resolving when all items loaded |
| `inited()` | Returns `StatefulPromise` resolving when all items inited |
| `unloaded()` | Returns `StatefulPromise` resolving when all items unloaded |

**Events:** `load`, `init`, `unload`, `update`, `update.{name}`

**Properties:** `items`, `values`, `isLoaded`, `isInited`, `target`, `emitUpdate`

---

### SubscriptionGroup Definition Format

Each definition describes one subscription in the group.

**Object form:**

```ts
{
	name: string;
	type?: "object" | "array" | "map";
	publicationName?: string;  // defaults to name
	params?: unknown[];
	value?: SubscriptionObjectWithSubscription | SubscriptionArrayWithSubscription | SubscriptionMapWithSubscription;
	handle?: (updated, group) => void;
	onBeforeInit?: (value) => void;
	debounce?: number;
	preventBind?: boolean;  // skip binding to target
}
```

**Tuple form:** `[name, type?, publicationName?, params?, handle?, onBeforeInit?, debounce?, preventBind?]`

---

### Update Protocol

**SubscriptionObject:** `Updates` is `Record<string, unknown> | null`. Non-null merges into the object; null clears.

**SubscriptionArray:** `Updates` is an array of:

| Op | Format | Description |
|----|--------|-------------|
| `"i"` | `["i", items[], sort?]` | Initial load. `sort`: -1 (desc), 0 (none), 1 (asc) |
| `"a"` | `["a", item]` | Add item |
| `"d"` | `["d", item]` | Delete item |
| null | — | Clear |

**SubscriptionMap:** `Updates` is an array of:

| Op | Format | Description |
|----|--------|-------------|
| `"i"` | `["i", items[], sortList?]` | Initial load. `sortList`: `{ field: -1|1 }` |
| `"c"` | `["c", item]` | Create item |
| `"u"` | `["u", item, fields]` | Update item. `fields`: array of changed keys or `true` (atomic) |
| `"d"` | `["d", _id]` | Delete by id |
| null | — | Clear |

---

### Symbols

Exported for extension and integration with other inSite packages:

| Symbol | Purpose |
|--------|---------|
| `updateSymbol` | Method to apply updates |
| `getHandleUpdateSymbol` / `setHandleUpdateSymbol` | Get/set update handler |
| `getAsUpdatesSymbol` | Serialize current state as updates |
| `getAsInitialUpdatedSymbol` | Get current state as "initial updated" shape |
| `clearSymbol` | Clear container |
| `subscribeSymbol` / `unsubscribeSymbol` / `renewSymbol` | Subscription lifecycle |
| `getSubscriptionSymbol` | Get underlying Subscription |
| `getHandleSubscriptionSymbol` / `setHandleSubscriptionSymbol` | Handler wiring |

---

## Related

- [insite-ws](../ws/README.md) — provides WS
- [insite-subscriptions-server](../subscriptions-server/README.md) — server counterpart
- [insite-client](../client/README.md), [insite-users-client](../users-client/README.md) — use subscriptions

## License

MIT
