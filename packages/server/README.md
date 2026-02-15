# insite-server

[![npm](https://img.shields.io/npm/v/insite-server)](https://www.npmjs.com/package/insite-server)

Orchestrator for the inSite server. Wires MongoDB, HTTP, WebSocket, users, subscriptions, cookies, and config into a single initializable instance.

Part of [inSite](../../README.md) — composes [insite-db](../db/README.md), [insite-http](../http/README.md), [insite-ws](../ws/README.md), [insite-users-server](../users-server/README.md), [insite-users-server-ws](../users-server-ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-ws-transfers](../ws-transfers/README.md), [insite-config](../config/README.md), [insite-cookie](../cookie/README.md), [insite-common](../common/README.md).

## Installation

```sh
npm install insite-server
```

Or:

```sh
bun add insite-server
```

## Quick Start

```ts
import { InSite } from "insite-server";

const inSite = await InSite.init({
	db: { url: "mongodb://127.0.0.1:27017", name: "mydb" },
	port: 3000,
	wss: {},
	users: { abilities: [] },
	http: true,
	cookie: {}
});
```

`InSite.init(options)` returns `Promise<InSite>`. The constructor `new InSite(options?)` triggers `init` asynchronously when options are passed. Use `whenReady()` to await initialization completion.

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `InSite` | class | Main orchestrator |
| `Options<AS>` | type | InSite options |
| `OmitRedundant<I, O>` | type | Omits from `I` properties not configured in `O` |
| `ServerConfig<O>` | type | Config type for given options |
| `WSServerWithActualProps<AS, O>` | type | WSServer type with publish/transfer props based on options |
| `UsersServerWithActualProps<AS, O>` | type | UsersServer type with publication props based on options |
| `AbilitiesSchema` | type | From [insite-common](../common/README.md) |
| `CookieMiddleware`, `CookieSetter`, `parseCookie` | class/function | From [insite-cookie](../cookie/README.md) |
| `CookieSetterOptions` | type | From [insite-cookie](../cookie/README.md) |
| `connect`, `connectToDB`, `Collections`, MongoDB types | — | From [insite-db](../db/README.md); `DBOptions` type |
| `HTTPServer`, `StaticMiddleware`, `TemplateMiddleware`, etc. | — | From [insite-http](../http/README.md); `HTTPServerOptions` type |
| `SubscriptionHandler`, `Publication`, `SubscriptionHandle`, etc. | — | From [insite-subscriptions-server](../subscriptions-server/README.md) |
| `Users`, `AbilityError`, `PermissionError`, etc. | — | From [insite-users-server](../users-server/README.md); `UsersOptions` type |
| `UsersServer`, `WSSCWithUser` | — | From [insite-users-server-ws](../users-server-ws/README.md); `UsersServerOptions` type |
| `IncomingTransport`, `OutgoingTransport`, `WithTransfer`, `WithOnTransfer` | — | From [insite-ws-transfers](../ws-transfers/README.md) |
| `WSServer`, `WSServerClient` | — | From [insite-ws](../ws/README.md); `WSServerOptions` type |

### InSite

```ts
class InSite<O extends Options<any>, AS extends AbilitiesSchema>
```

**Constructor**

```ts
new InSite<O, AS>(options?: O)
```

Creates an instance. If `options` is provided, calls `init` asynchronously.

**Instance properties** (populated after `init` based on options)

| Property | Type | When present |
|----------|------|--------------|
| `mongoClient` | `MongoClient` | `db` option |
| `db` | `DB` | `db` option |
| `collections` | `Collections` | `db` option |
| `config` | `ServerConfig<O>` | `config` option |
| `wss` | `WSServerWithActualProps<AS, O>` | `wss` option |
| `incomingTransport` | `IncomingTransport<WSSCWithUser<AS>>` | `wss.incomingTransport` or `users` |
| `outgoingTransport` | `OutgoingTransport<WSSCWithUser<AS>>` | `wss.outgoingTransport` |
| `subscriptionHandler` | `SubscriptionHandler<AS>` | `wss.subscriptions` |
| `usersServer` | `UsersServerWithActualProps<AS, O>` | `users` with `server` and WS |
| `users` | `Users<AS>` | `users` option |
| `cookie` | `CookieSetter<AS>` | `cookie` and `usersServer` and `http` |
| `http` | `HTTPServer` | `http` option |

**Instance methods**

| Method | Returns | Description |
|--------|---------|--------------|
| `whenReady()` | `Promise<this>` | Resolves when `init` completes |

**Static methods**

| Method | Returns | Description |
|--------|---------|--------------|
| `InSite.init(options, asPromise?)` | `Promise<OmitRedundant<IS, IO>>` or `OmitRedundant<IS, IO>` | Factory. With `asPromise === false`, returns instance synchronously. |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `db` | `DBOptions` | MongoDB connection (`url`, `name`, `onConnect`) |
| `config` | `ConfigSchema \| null` | Schema for config collection |
| `ssl` | `{ cert: string; key: string }` | TLS certificates for HTTP and WS |
| `port` | `number \| string` | Port for HTTP and WS server |
| `wss` | `WSS<AS>` | WebSocket server options (subscriptions, transports) |
| `users` | `Users<AS>` | Users, roles, orgs, sessions |
| `cookie` | `Cookie<AS> \| null` | Cookie middleware and setter options |
| `http` | `HTTP` | HTTP server (static, template, middlewares) |
| `public` | `boolean` | Whether the server is public |

## Related

- [insite-client](../client/README.md) — connects to this server
- [insite-db](../db/README.md), [insite-http](../http/README.md), [insite-ws](../ws/README.md), [insite-users-server](../users-server/README.md), [insite-users-server-ws](../users-server-ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-ws-transfers](../ws-transfers/README.md), [insite-config](../config/README.md), [insite-cookie](../cookie/README.md), [insite-common](../common/README.md)

## License

MIT
