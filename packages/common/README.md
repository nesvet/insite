# insite-common

Shared types and backend utilities for the inSite ecosystem. Defines ability schema for RBAC and configuration, plus server helpers for HTTP(S), SSL, and client IP resolution.

Part of [inSite](../../README.md) — used by all inSite packages.

## Installation

```sh
npm install insite-common
```

Or:

```sh
bun add insite-common
```

## Entry Points

| Import | Use case |
|--------|----------|
| `insite-common` | Full access — types and backend utilities |
| `insite-common/frontend` | Client-side — types only |
| `insite-common/backend` | Server-side — types and server utilities |

## Quick Start

```ts
import type { AbilitiesSchema, Abilities } from "insite-common/frontend";

const abilities: AbilitiesSchema = [
	{ _id: "users", top: true, abilities: [{ _id: "edit" }, { _id: "view" }] }
];
```

## API Reference

### Exports

**Types** (from `insite-common`, `insite-common/frontend`, `insite-common/backend`):

| Export | Description |
|--------|-------------|
| `AbilityParamItemSchema` | Base schema for items in `items`-type parameter. Fields: `_id`, `title?`, `description?` |
| `AbilityParamSchema` | Union: Items (`type: "items"`, `items`, `isInheritable?`) or Number (`type: "number"`, `min?`, `max?`, `isInheritable?`) |
| `AbilitySchema` | Schema for single ability. Fields: `params?`, `abilities?`, `isInheritable?`, `top?` |
| `AbilitiesSchema` | `readonly AbilitySchema[]` |
| `ScanAbilitySchemas<AS, ForceTopLevel?>` | Builds `Partial` object from ability schemas |
| `Abilities<AS>` | Full abilities type; includes `login` and `inSite` plus your top-level abilities |

**Backend** (from `insite-common` or `insite-common/backend`):

| Export | Signature | Description |
|--------|-----------|-------------|
| `createServer` | `(options, port?) => http.Server \| https.Server \| Promise<...>` | Creates HTTP/HTTPS server. HTTPS when `key` and `cert` present |
| `showServerListeningMessage` | `(server: { icon, name, protocol, server }) => void` | Logs server address to console |
| `resolveSSL` | `(ssl?: { cert, key }) => { cert, key } \| undefined` | Resolves SSL from paths or env (`INSITE_SSL_CERT`, `INSITE_SSL_KEY`) |
| `getRemoteAddress` | `(request: IncomingMessage) => string` | Client IP from proxy headers or `socket.remoteAddress` |

### createServer

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `http.ServerOptions` \| `https.ServerOptions` | Node.js server options |
| `port` | `number` \| `string` | Optional. If provided, starts listening and returns Promise |

### resolveSSL

| Parameter | Type | Description |
|-----------|------|-------------|
| `ssl` | `{ cert: Buffer \| string; key: Buffer \| string }` | Optional. Defaults to `INSITE_SSL_CERT` and `INSITE_SSL_KEY` env vars |

### getRemoteAddress

Checks: `Forwarded`, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, `True-Client-IP`. Falls back to `socket.remoteAddress`.

## Related

- [insite-server](../server/README.md), [insite-users-server](../users-server/README.md), [insite-http](../http/README.md), and all inSite packages use insite-common

## License

MIT
