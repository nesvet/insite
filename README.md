# insite-ws

WebSocket abstraction for the inSite stack. Server and client with heartbeat, request/response protocol, and connection quality tracking.

Part of [inSite](../../README.md) — used by [insite-ws-transfers](../ws-transfers/README.md), [insite-users-server-ws](../users-server-ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-cookie](../cookie/README.md).

## Installation

```sh
npm install insite-ws
```

Or:

```sh
bun add insite-ws
```

## Overview

The package provides three entry points:

| Entry | Environment | Description |
|-------|-------------|-------------|
| `insite-ws/server` | Node.js | WebSocket server with heartbeat and request handlers |
| `insite-ws/client` | Browser, Bun | WebSocket client with auto-reconnect and request/response |
| `insite-ws/client/node` | Node.js | Same client; polyfills `globalThis.WebSocket` with `ws` |

**Message format:** JSON arrays. First element is the message kind; the rest are payload. Example: `["my-event", { id: 1 }]`.

**Request/response:** Built-in RPC uses `~r-q` (request) and `~r-s` (response) as message kinds. Client sends `["~r-q", id, kind, ...args]`; server replies with `["~r-s-{id}", error, result]`.

**Heartbeat:** Empty frames sent every 5 seconds. Missing heartbeat triggers disconnect after timeout.

## Server API (`insite-ws/server`)

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `WSServer` | class | WebSocket server |
| `WSServerClient` | class | WebSocket client (extends `ws` WebSocket) |
| `Options` | type | Constructor options for `WSServer` |

### WSServer

```ts
import { WSServer } from "insite-ws/server";

const wss = new WSServer({ port: 8080 });
```

**Constructor:** `new WSServer(options: Options<WSSC>)`

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `icon` | `string` | `"🔌"` | Icon for console logs |
| `name` | `string` | `"WS"` | Server name |
| `ssl` | `{ cert, key }` | — | TLS config (Buffer or string) |
| `port` | `number \| string` | 80/443 | Port to listen on |
| `server` | `http.Server \| https.Server` | — | Existing HTTP server; if omitted, one is created |
| `quiet` | `boolean` | `false` | Suppress console output |
| `WebSocket` | class | `WSServerClient` | Custom client class |

Also accepts `ws` `ServerOptions` (e.g. `path`, `verifyClient`).

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `icon` | `string` | Icon for logs |
| `name` | `string` | Server name |
| `protocol` | `getter` | `"ws"` or `"wss"` |
| `server` | `http.Server \| https.Server` | Underlying HTTP server |
| `isS` | `getter` | `true` if HTTPS |
| `isWebSocketServer` | `true` | Type guard |
| `isWebSocketServerClient` | `false` | Type guard |
| `isWebSocket` | `false` | Type guard |

**Methods:**

| Method | Description |
|--------|--------------|
| `addRequestListener(kind, listener)` | Register handler for request kind. `listener(wssc, ...args)` returns result or throws. |
| `removeRequestListener(kind)` | Unregister handler |
| `onRequest` | Alias for `addRequestListener` |
| `offRequest` | Alias for `removeRequestListener` |

**Static:**

| Method/Property | Description |
|-----------------|--------------|
| `makeProps({ ssl })` | Returns HTTP server options from `ssl` |
| `CLOSE_CODES` | See close codes below |

**Events:**

| Event | Args | Description |
|-------|------|-------------|
| `connection` | `(socket, request)` | From `ws`; socket is `WSServerClient` |
| `client-connect` | `(wssc, request)` | Client connected |
| `client-error` | `(wssc, error?)` | Client error |
| `client-close` | `(wssc)` | Client disconnected |
| `client-message` | `(wssc, kind, ...rest)` | Any message |
| `client-message:${kind}` | `(wssc, ...rest)` | Message of specific kind |

### WSServerClient

Extends `WebSocket` from `ws`. Each connected client is an instance.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `wss` | `WSServer<this>` | Parent server |
| `userAgent` | `string` | From request headers |
| `remoteAddress` | `string` | Client IP |
| `latency` | `number` | Last heartbeat round-trip (ms) |
| `isConnecting` | `getter` | `readyState === CONNECTING` |
| `isOpen` | `getter` | `readyState === OPEN` |
| `isClosing` | `getter` | `readyState === CLOSING` |
| `isClosed` | `getter` | `readyState === CLOSED` |
| `isWebSocketServerClient` | `true` | Type guard |
| `isWebSocketServer` | `false` | Type guard |
| `isWebSocket` | `false` | Type guard |

**Methods:**

| Method | Description |
|--------|--------------|
| `sendMessage(...args)` | Sends `JSON.stringify(args)` |
| `sendRequest(...args)` | RPC. Last arg can be callback `(error, result) => void`; otherwise returns `Promise<unknown>` |

**Static:** `CLOSE_CODES` — same as `WSServer.CLOSE_CODES`

## Client API (`insite-ws/client`)

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `WS` | class | WebSocket client |
| `Options` | type | Constructor options |

### WS

```ts
import { WS } from "insite-ws/client";

const ws = new WS({ url: "wss://example.com" });
ws.on("open", () => ws.sendMessage("hello", { data: 1 }));
```

**Constructor:** `new WS(options?: Options)`

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `URL \| string` | `globalThis.__insite?.wss_url \|\| "/"` | WebSocket URL |
| `name` | `string` | `"0"`, `"1"`, … | Client name (for logs) |
| `protocols` | `string[]` | — | Subprotocols |
| `immediately` | `boolean` | `true` | Connect on construction |
| `reconnectAfter` | `number \| null` | `2000` | Reconnect delay (ms); `null` disables |
| `on` | `Record<string, Function>` | — | Event listeners to attach |
| `once` | `Record<string, Function>` | — | One-time listeners |
| `quiet` | `boolean` | `false` | Suppress console output |
| `signal` | `AbortSignal` | — | Abort on signal |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string \| URL` | Current URL |
| `name` | `string` | Client name |
| `protocols` | `string[] \| undefined` | Subprotocols |
| `reconnectAfter` | `number \| null` | Reconnect delay |
| `connectionQuality` | `ConnectionQuality` | 0–4; see `CONNECTION_QUALITY` |
| `webSocket` | `WebSocket \| null` | Underlying socket |
| `state` | `getter` | `"connecting" \| "open" \| "unresponsive" \| "closing" \| "closed"` |
| `isConnecting` | `getter` | `true` when connecting |
| `isOpen` | `getter` | `true` when open |
| `isClosing` | `getter` | `true` when closing |
| `isClosed` | `getter` | `true` when closed |
| `closedWith` | `{ code, reason, wasClean } \| null` | Last close info |
| `isUsed` | `boolean` | Set after first connect |
| `isDestroyed` | `boolean` | If `destroy()` was called |
| `isWebSocket` | `true` | Type guard |
| `isWebSocketServer` | `false` | Type guard |
| `isWebSocketServerClient` | `false` | Type guard |

**Methods:**

| Method | Description |
|--------|--------------|
| `open(options?)` | Connect. `options` can override `url` and `protocols`. Returns `Promise<void>`. |
| `connect` | Alias for `open` |
| `close(code?, reason?, wasClean?)` | Close connection. Defaults: `code=3500`, `reason="manual"`, `wasClean=true` |
| `disconnect` | Alias for `close` |
| `send(data)` | Send raw data (string, Blob, ArrayBuffer, etc.) |
| `sendMessage(...args)` | Sends `JSON.stringify(args)` |
| `sendRequest(...args)` | RPC. Last arg can be callback `(error, result) => void`; otherwise returns `Promise<T>`. |
| `addRequestListener(kind, listener)` | Register handler for request kind. `listener(...args)` returns result or throws. |
| `removeRequestListener(kind)` | Unregister handler |
| `onRequest` | Alias for `addRequestListener` |
| `offRequest` | Alias for `removeRequestListener` |
| `destroy()` | Close, remove listeners, mark destroyed |

**Static:**

| Property | Description |
|----------|-------------|
| `CONNECTION_QUALITY` | `{ CLOSED: 0, RECONNECTING: 1, UNRESPONSIVE: 2, CHECKING_RESPONSIVENESS: 3, OPEN: 4 }` |

**Events:**

| Event | Args | Description |
|-------|------|-------------|
| `connecting` | — | Connection attempt started |
| `open` | — | Connected |
| `close` | `(closeEvent)` | Disconnected |
| `message` | `(kind, ...rest)` | Any message |
| `message:${kind}` | `(...rest)` | Message of specific kind |
| `error` | `(error)` | Error |
| `responsive` | — | Was unresponsive, now responsive |
| `unresponsive` | — | No heartbeat response; may be offline |
| `connection-quality-change` | `(quality, prevQuality)` | Connection quality changed |
| `server-change` | `(url, prevUrl)` | URL changed before connect |
| `destroy` | — | `destroy()` called |

## Client (Node) (`insite-ws/client/node`)

Re-exports everything from `insite-ws/client`. Importing this module polyfills `globalThis.WebSocket` with the `ws` package, so `WS` works in Node.js without a native WebSocket.

```ts
import { WS } from "insite-ws/client/node";
// globalThis.WebSocket is now set
```

## Close Codes

`WSServer.CLOSE_CODES` and `WSServerClient.CLOSE_CODES`:

| Code | Value | Description |
|------|-------|-------------|
| `NORMAL` | 1000 | Normal closure |
| `PROTOCOL_ERROR` | 1002 | Protocol error |
| `ABNORMAL` | 1006 | Abnormal closure |
| `NO_HEARTBEAT` | 3000 | No heartbeat received |
| `OFFLINE` | 3001 | Client went offline |
| `MANUAL` | 3500 | Manual close |
| `REOPEN` | 4000 | Reconnecting (e.g. URL change) |

## Related

- [insite-ws-transfers](../ws-transfers/README.md), [insite-users-server-ws](../users-server-ws/README.md), [insite-subscriptions-server](../subscriptions-server/README.md), [insite-cookie](../cookie/README.md)

## License

MIT
