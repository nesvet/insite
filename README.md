# insite-subscriptions-server

Server-side pub/sub layer for inSite. Defines publications (named data sources), subscription handles, and WebSocket integration for real-time updates.

Part of [inSite](../../README.md) — wires to [insite-ws](../ws/README.md) and [insite-users-server-ws](../users-server-ws/README.md); uses [insite-db](../db/README.md).

## Installation

```sh
npm install insite-subscriptions-server
```

Or:

```sh
bun add insite-subscriptions-server
```

## Overview

The package provides two data modes:

- **object** — arbitrary data via custom `fetch`; you call `changed()` to push updates
- **map** — MongoDB collection with query, projection, sort; reacts to Change Streams and sends diff updates

Two entry points:

- **Main** (`insite-subscriptions-server`) — low-level API: `Publication`, `SubscriptionHandle`, `CollectionMapPublication`, `CollectionMapSubscriptionHandle`
- **WS** (`insite-subscriptions-server/ws`) — wires subscription protocol to [insite-ws](../ws/README.md) and [insite-users-server-ws](../users-server-ws/README.md); adds `SubscriptionHandler` and `wss.publish()`

## Core Concepts

**Publication** — Named data source. Holds subscribers, invokes `fetch` or queries MongoDB, notifies on changes.

**SubscriptionHandle** — Subscription to a publication. Calls `handler(fetched, reason)` when data changes.

**CollectionMapPublication** — Publication backed by a `WatchedCollection`. Supports query, projection, sort. Listens to Change Streams and emits incremental updates.

**CollectionMapSubscriptionHandle** — Subscription to a map publication. Receives diff updates: `["i", items, sort?]`, `["c", doc]`, `["u", doc, fields?]`, `["d", _id]`.

## Public API

### Main Entry (`insite-subscriptions-server`)

| Export | Description |
|--------|-------------|
| `publications` | `Map<string, Publication>` — global registry |
| `Publication` | Class |
| `SubscriptionHandle` | Class |
| `CollectionMapPublication` | Class |
| `CollectionMapSubscriptionHandle` | Class |
| `skippedChangeStreamDocuments` | `WeakSet<ChangeStreamDocument>` — documents to skip in Change Stream handling |
| `Projection` | type |

---

### Publication

```ts
class Publication<SA extends SubscriptionArgs = SubscriptionArgs>
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Publication name (readonly) |
| `type` | `string` | `"object"` (default) |
| `subscriptions` | `Set<SubscriptionHandle<SA>>` | Active subscribers |
| `onSubscribe` | `(subscription) => void` | Optional callback on subscribe |
| `onUnsubscribe` | `(subscription) => void` | Optional callback on unsubscribe |
| `fetch` | `(...args: SA) => unknown` | Optional; called to fetch data |

| Method | Description |
|--------|-------------|
| `constructor(name, props?)` | Registers in `publications` |
| `subscribe(subscription)` | Adds subscriber, calls `onSubscribe` |
| `unsubscribe(subscription)` | Removes subscriber, calls `onUnsubscribe` |
| `changed(reason?)` | Notifies all subscribers |
| `fetchSubscription(subscription, reason?)` | Fetches for one subscriber; defaults to `fetch(...subscription.args)` |

---

### SubscriptionHandle

```ts
class SubscriptionHandle<SA extends SubscriptionArgs>
```

| Property | Type | Description |
|----------|------|-------------|
| `publication` | `Publication<SA>` | The publication |
| `args` | `SA` | Arguments passed to `fetch` |
| `handler` | `SubscriptionHandler` | `(fetched, reason?) => void` |

| Method | Description |
|--------|-------------|
| `constructor(publicationName, args, handler, immediately?, prevent?)` | Subscribes if publication exists; `immediately` triggers initial fetch; `prevent` skips auto-subscribe |
| `changed(reason?)` | Fetches and calls `handler` |
| `cancel()` | Unsubscribes |
| `renew()` | Unsubscribes, resubscribes, fetches |

---

### CollectionMapPublication

```ts
class CollectionMapPublication<D extends Document, SA extends SubscriptionArgs> extends Publication<SA>
```

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `WatchedCollection<D>` | MongoDB collection with Change Stream |
| `queryProps` | `((...args: SA) => QueryProps<D> \| false \| null \| void) \| QueryProps<D> \| false \| null` | Query config per subscription |
| `transform` | `(doc: TransformableDoc<D>, args: SA) => void` | Optional doc transform before send |
| `type` | `string` | `"map"` |

| Method | Description |
|--------|-------------|
| `constructor(collection, name, queryProps?, transform?)` | |
| `skip(next)` | Adds `next` to `skippedChangeStreamDocuments` |
| `makeQueryProps(args)` | Returns `{ query, projection, isProjectionInclusive, fields, sort, args }` |
| `flushInitial()` | Fetches for all subscribers, sends as single batch |
| `changed(reason)` | `Promise` — notifies all subscribers |

`onSubscribe` / `onUnsubscribe` are set internally to manage Change Stream listeners.

**QueryProps:**

| Field | Type | Description |
|-------|------|-------------|
| `query` | `Filter<D>` | MongoDB filter |
| `projection` | `Projection` | Field selection |
| `sort` | `Sort` | Sort spec |
| `triggers` | `string[]` | Fields that affect projection (for update filtering) |

---

### CollectionMapSubscriptionHandle

```ts
class CollectionMapSubscriptionHandle<D extends Document, SA extends SubscriptionArgs> extends SubscriptionHandle<SA>
```

| Property | Type | Description |
|----------|------|-------------|
| `ids` | `Set<string>` | Document ids in current result set |
| `query` | `Filter<D> \| null` | Set by `onSubscribe` |
| `projection` | `Projection \| null` | Set by `onSubscribe` |
| `isProjectionInclusive` | `boolean` | Set by `onSubscribe` |
| `fields` | `Set<string> \| null` | Set by `onSubscribe` |
| `sort` | `Sort \| null` | Set by `onSubscribe` |
| `match` | `(doc: D) => boolean` | Sift matcher for query |
| `updates` | `unknown[]` | Pending updates (batched) |
| `flushUpdates` | `() => void` | Sends `updates` to handler and clears |
| `collectionChangeListener` | `(next: ChangeStreamDocument<D>) => Promise<void>` | Change Stream handler |

| Method | Description |
|--------|-------------|
| `constructor(publicationName, args, handler, immediately?)` | Subscribes and optionally fetches initial data |
| `changed(next?)` | Fetches and calls `handler([result])` |

**Map update format** (passed to `handler` as array of tuples):

| Tuple | Description |
|-------|-------------|
| `["i", items[], sort?]` | Initial load |
| `["c", doc]` | Create |
| `["u", doc, fields?]` | Update; `fields` is `string[]`, `true`, or `undefined` |
| `["d", _id]` | Delete |

---

### Types

| Type | Description |
|------|-------------|
| `PublicationProps<SA>` | `{ type?, fetch?, fetchSubscription?, onSubscribe?, onUnsubscribe? }` |
| `Projection` | `{ [key: string]: Projection \| boolean \| number }` — MongoDB-style projection |
| `PartialWithId<D>` | `Partial<D> & { _id: string }` |
| `TransformableDoc<D>` | `PartialWithId<D> & { [key: string]: any }` |
| `SubscriptionArgs` | `unknown[]` |
| `SubscriptionHandler` | `(fetched: unknown, reason?: unknown) => void` |

---

### WS Entry (`insite-subscriptions-server/ws`)

| Export | Description |
|--------|-------------|
| `SubscriptionHandler` | Wires subscription protocol to `WSServer` |
| `Publication` | Publication with `WSSubscriptionArgs` (first arg is `WSSCWithUser`) |
| `SubscriptionHandle` | Subscription handle for WS context |
| `CollectionMapPublication` | Map publication for WS context |
| `CollectionMapSubscriptionHandle` | Map subscription handle for WS context |
| `Subscriptions` | `Map<number \| string, SubscriptionHandle>` — per-client subscriptions |
| `WithPublish<T, AS>` | Type: `T & { publish(...) }` |
| `WithPublishCollection<T, AS>` | Type: `T & WithPublish & { publish(...) }` for collections |
| `isPublicationCollectionMap(publication)` | Type guard |
| `isCollectionMapPublicationArgs(args)` | Type guard |

---

### SubscriptionHandler

```ts
class SubscriptionHandler<AS extends AbilitiesSchema>
```

| Method | Description |
|--------|-------------|
| `constructor(wss: WSServer, withCollections?)` | Listens to `client-connect`, `client-session`, `client-message:s-s`, `client-message:s-u`, `client-close`, `should-renew-subscriptions`. When `withCollections` is true, adds `wss.publish()` for both object and map publications |
| `renewSubscriptionsFor(webSockets)` | Renews subscriptions for given clients |

**Protocol messages:**

| Message | Direction | Description |
|--------|-----------|-------------|
| `s-s` | client → server | Subscribe: `(type, publicationName, id, ...restArgs, immediately?)` |
| `s-u` | client → server | Unsubscribe: `(id)` |
| `s-c` | server → client | Changed: `(id, data)` |

---

## Usage

**Object publication (standalone):**

```ts
import {
	publications,
	Publication,
	SubscriptionHandle
} from "insite-subscriptions-server";

const pub = new Publication("items", {
	type: "object",
	fetch: () => ({ items: [1, 2, 3] })
});

const handle = new SubscriptionHandle("items", [], (data) => {
	console.log(data);
}, true);

pub.changed(); // pushes update to all subscribers
handle.cancel();
```

**Map publication (MongoDB):**

```ts
import { CollectionMapPublication, CollectionMapSubscriptionHandle } from "insite-subscriptions-server";

const pub = new CollectionMapPublication(
	collection,
	"items",
	(userId) => ({ query: { userId }, projection: { name: 1 } }),
	(doc, args) => { doc.extra = "computed"; }
);

const handle = new CollectionMapSubscriptionHandle("items", [userId], (updates) => {
	// updates: [["i", items, sort], ["c", doc], ["u", doc, fields], ["d", id]]
}, true);
```

**WebSocket integration:**

```ts
import { SubscriptionHandler } from "insite-subscriptions-server/ws";
import type { WSServer } from "insite-ws/server";

const wss: WSServer = /* ... */;
new SubscriptionHandler(wss, true);

// With withCollections: true, wss gets publish()
const pub = wss.publish(collection, "items", (wssc, userId) => ({
	query: { userId },
	projection: { name: 1 }
}));
```

## Related

- [insite-ws](../ws/README.md), [insite-users-server-ws](../users-server-ws/README.md), [insite-db](../db/README.md)
- [insite-subscriptions-client](../subscriptions-client/README.md) — client counterpart

## License

MIT
