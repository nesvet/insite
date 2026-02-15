# insite-client

[![npm](https://img.shields.io/npm/v/insite-client)](https://www.npmjs.com/package/insite-client)

Client-side inSite SDK — WebSocket, auth, subscriptions, file transfers. Single entry point for connecting to an inSite server.

Part of [inSite](../../README.md) — built on [insite-ws](../ws/README.md), [insite-cookie](../cookie/README.md), [insite-users-client](../users-client/README.md), [insite-subscriptions-client](../subscriptions-client/README.md), [insite-ws-transfers](../ws-transfers/README.md).

## Installation

```sh
npm install insite-client
```

Or:

```sh
bun add insite-client
```

## Quick Start

```ts
import { InSite } from "insite-client";

// Sync — returns InSite immediately, init runs in background
const inSite = InSite.init({
	ws: { url: "wss://your-server.example.com" }
});

inSite.on("ready", () => {
	console.log("Connected");
});

// Async — returns Promise that resolves when ready
const inSite = await InSite.init(
	{ ws: { url: "wss://your-server.example.com" } },
	true
);
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `InSite` | class | Main facade class |
| `Options<AS>` | type | Client options |
| `AbilitiesSchema`, `AbilitySchema`, `AbilityParamSchema`, `Abilities`, `ScanAbilitySchemas` | type | From [insite-common](../common/README.md) |
| `CookieSetter`, `CookieOptions` | class/type | From [insite-cookie](../cookie/README.md) |
| `Subscription`, `SubscriptionGroup`, `SubscriptionGroupItem`, `SubscriptionArray`, `SubscriptionMap`, `SubscriptionObject`, `SubscriptionMapWithSubscription`, `SubscriptionObjectWithSubscription` | class | From [insite-subscriptions-client](../subscriptions-client/README.md) |
| `Updated`, `Definition`, `SubscriptionType`, `SubscriptionGroupOptions`, `SubscriptionGroupTarget` | type | From [insite-subscriptions-client](../subscriptions-client/README.md) |
| `UsersSubscriptionGroup`, `UsersSubscriptionGroupOptions` | class/type | From [insite-users-client](../users-client/README.md) |
| `CurrentUser`, `Org`, `Orgs`, `OrgsExtended`, `Role`, `Roles`, `User`, `Users`, `UsersExtended` | type | From [insite-users-client](../users-client/README.md) |
| `IncomingTransport`, `OutgoingTransport`, `IncomingTransfer`, `OutgoingTransfer`, `WithTransfer`, `WithOnTransfer`, `IncomingTransportOptions`, `arrayBufferToBase64` | — | From [insite-ws-transfers](../ws-transfers/README.md) |
| `WS`, `WSOptions` | class/type | From [insite-ws](../ws/README.md) |

### InSite

| Member | Description |
|--------|-------------|
| `new InSite(options?)` | Constructor, optionally calls `init` |
| `InSite.init(options?, asPromise?)` | Static factory, returns `InSite` or `Promise<InSite>` |
| `ws` | WS instance (with `transfer`/`onTransfer` when transports enabled) |
| `incomingTransport` | IncomingTransport (when `ws.incomingTransport: true`) |
| `outgoingTransport` | OutgoingTransport (when `ws.outgoingTransport: true`) |
| `cookie` | CookieSetter (when `cookie` not null) |
| `usersSubscriptionGroup` | UsersSubscriptionGroup (when `users` + not `public`) |
| `user` | `CurrentUser \| null` (when `users`) |
| `users` | `Users \| UsersExtended` |
| `orgs` | `Orgs \| OrgsExtended` |
| `roles` | `Roles` |
| `isLoggedIn` | `boolean` |
| `login(email, password)` | `Promise` (when `users`) |
| `logout()` | `Promise` (when `users`) |
| `isReady` | `boolean` |
| `whenReady()` | `StatefulPromise<this>` |
| Events | `ready`, `login`, `logout` |

### Options

`Options<AS>` where `AS extends AbilitiesSchema`.

| Property | Type | Description |
|----------|------|-------------|
| `ws` | `WSOptions & { subscriptions?, incomingTransport?, outgoingTransport? }` | WebSocket config. Set `subscriptions: true` for pub/sub. Set `incomingTransport` / `outgoingTransport` for file transfers. |
| `cookie` | `CookieOptions \| null` | Cookie auth. Use `{}` to enable, `null` to disable. |
| `users` | `{ abilities?: AS } \| null` | Users/orgs/roles. Use `{}` to enable, `null` to disable. |
| `public` | `boolean` | When `true` with `users`, only `user` is loaded (no orgs, roles, users list). |

### WS

WebSocket client with auto-reconnect and request/response.

**Properties:** `url`, `name`, `protocols`, `reconnectAfter`, `signal`, `connectionQuality`, `webSocket`, `state`, `isConnecting`, `isOpen`, `isClosed`, `closedWith`

**Methods:** `open()`, `close()`, `send()`, `sendMessage()`, `sendRequest()`, `addRequestListener()`, `removeRequestListener()`, `destroy()`

**Events:** `connecting`, `open`, `close`, `message`, `message:${kind}`, `error`, `connection-quality-change`, `server-change`, `responsive`, `unresponsive`, `destroy`

### CookieSetter

Sets auth cookie via XHR when server sends a token.

```ts
constructor(ws: WS, options?: {
	method?: "GET" | "POST";
	url?: string;
	onload?: (this: XMLHttpRequest, event: ProgressEvent) => unknown;
	onerror?: (this: XMLHttpRequest, event: ProgressEvent) => unknown;
})
```

### Subscription

Low-level subscription to server publications. Use `Subscription.bindTo(ws)` before creating instances.

```ts
Subscription.bindTo(ws);

const sub = new Subscription(
	"object",           // type: "array" | "map" | "object"
	"user",             // publicationName
	[ true ],           // args
	(user) => { ... },  // handler
	true                // immediately (default: true)
);

sub.start();   // (re)subscribe
sub.cancel();  // unsubscribe
```

### IncomingTransport

Handles incoming file/data transfers. Adds `onTransfer()` and `onceTransfer()` to WS when enabled.

**Properties:** `sizeLimit`

**Methods:** `on()`, `once()`, `off()`, `addTransferListener()`, `removeTransferListener()`

### OutgoingTransport

Handles outgoing file/data transfers. Adds `transfer()` to WS when enabled.

```ts
ws.transfer("avatar", {
	data: file,
	onProgress: (transfer) => { ... },
	onEnd: (transfer) => { ... }
});
```

### UsersSubscriptionGroup

Subscription group for users, orgs, roles. Extends `SubscriptionGroup`.

**Methods:** `extend()` — load roles and extended user/org data; `unextend()` — detach extended subscriptions

## Usage Examples

**Minimal — WebSocket only:**

```ts
InSite.init({ ws: { url: "wss://..." } });
```

**With auth (public portal — current user only):**

```ts
InSite.init({
	ws: { url: "wss://...", subscriptions: true },
	cookie: {},
	users: {},
	public: true
});
```

**With auth (admin — full users/orgs/roles):**

```ts
InSite.init({
	ws: { url: "wss://...", subscriptions: true },
	cookie: {},
	users: {}
});
```

**With file transfers:**

```ts
InSite.init({
	ws: {
		url: "wss://...",
		incomingTransport: true,
		outgoingTransport: true
	}
});
```

**Use cases:** Public portal — `public: true`, `user` only. Admin panel — `users: {}`, full `UsersSubscriptionGroup`. File uploads — `outgoingTransport: true`, `ws.transfer(kind, props)`.

## Related

- [insite-server](../server/README.md) — backend this client connects to
- [insite-ws](../ws/README.md), [insite-cookie](../cookie/README.md), [insite-users-client](../users-client/README.md), [insite-subscriptions-client](../subscriptions-client/README.md), [insite-ws-transfers](../ws-transfers/README.md), [insite-common](../common/README.md)

## License

MIT
