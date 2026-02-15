# insite-ws-transfers

[![npm](https://img.shields.io/npm/v/insite-ws-transfers)](https://www.npmjs.com/package/insite-ws-transfers)

File transfers over WebSockets for the inSite stack. Streams data in chunks with progress tracking, abort support, and receiver confirmation.

Part of [inSite](../../README.md) — built on [insite-ws](../ws/README.md). Requires `WSServer` or `WS` from that package.

## Installation

```sh
npm install insite-ws-transfers
```

Or:

```sh
bun add insite-ws-transfers
```

## Overview

**Entry points:**

| Entry | Environment | Description |
|-------|-------------|-------------|
| `insite-ws-transfers` | Node.js | Default; same as `/node` |
| `insite-ws-transfers/node` | Node.js | Incoming/outgoing with streams and file paths |
| `insite-ws-transfers/browser` | Browser | Incoming/outgoing with `File` API |

**Protocol flow:** Sender sends a transfer request → Receiver confirms (or rejects via `begin` returning `false`) → Chunks stream over the wire → Progress updates every 250 ms → Completion, abort, or error.

**Transfer types:** `object` (JSON), `string`, `datauri`, `file`, `stream` (Node only).

## Usage

### Node server (receiving)

```ts
import { WSServer } from "insite-ws/server";
import { IncomingTransport } from "insite-ws-transfers";

const wss = new WSServer({ port: 8080 });
new IncomingTransport(wss, { sizeLimit: 50 * 1024 * 1024 });

wss.onTransfer("file", {
	begin(wssc, transfer) {
		// Return false to reject
	},
	end(wssc, transfer) {
		// transfer.data is ready (Buffer, string, or parsed object)
	}
});
```

### Node server (sending)

```ts
import { OutgoingTransport } from "insite-ws-transfers";

new OutgoingTransport(wss);
const transfer = wss.transfer(wssc, "file", { data: "/path/to/file.pdf" });
```

### Browser client

```ts
import { WS } from "insite-ws/client";
import { IncomingTransport, OutgoingTransport } from "insite-ws-transfers/browser";

const ws = new WS({ url: "wss://example.com" });
new IncomingTransport(ws);
new OutgoingTransport(ws);

ws.onTransfer("file", { end(transfer) { console.log(transfer.data); } });
ws.transfer("file", { data: fileInput.files[0] });
```

## Transfer types by environment

| Type | Node (out) | Node (in) | Browser (out) | Browser (in) |
|------|------------|-----------|---------------|---------------|
| object | ✓ | ✓ | ✓ | ✓ |
| string | ✓ | ✓ | ✓ | ✓ |
| datauri | ✓ | ✓ | ✓ | ✓ |
| file | File path | Stream / Buffer | `File` | Base64 string |
| stream | `Readable` | Stream / Buffer | — | — |

## API Reference

### IncomingTransport

Handles incoming transfers. Attaches `onTransfer` and `onceTransfer` to the WS instance.

**Constructor:** `new IncomingTransport(ws, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sizeLimit` | `number` | 10 GB | Max transfer size in bytes |

**Methods:**

| Method | Description |
|--------|-------------|
| `addTransferListener(kind, listener, options?)` | Register handler for transfer kind |
| `on(kind, listener, options?)` | Alias for `addTransferListener` |
| `once(kind, listener, options?)` | One-time listener |
| `removeTransferListener(kind, listener?)` | Unregister; omit `listener` to remove all for kind |
| `off(kind, listener?)` | Alias for `removeTransferListener` |

**Properties:** `sizeLimit` — max transfer size.

### IncomingTransfer

Represents an incoming transfer. Instance of `IncomingTransfer` (browser) or `NodeIncomingTransfer` (Node).

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `ws` | `WS \| WSServerClient` | WebSocket connection |
| `id` | `string` | Transfer ID |
| `kind` | `string` | Transfer kind (e.g. `"file"`) |
| `type` | `TransferTypes` | Data type |
| `collect` | `boolean` | Whether data is buffered |
| `encoding` | `"base64" \| "buffer" \| "utf8"` | Chunk encoding |
| `size` | `number` | Total size in bytes (0 if unknown) |
| `metadata` | `Record<string, unknown>` | Sender metadata |
| `confirmResponse` | `string \| undefined` | Set in `begin` to send custom response to sender |
| `data` | `Buffer \| string \| undefined` | Collected result (when `collect` and transfer done) |
| `progress` | `number` | 0–1 receiver progress |
| `transferedSize` | `number` | Bytes received so far |
| `processedSize` | `number` | Bytes processed so far |
| `bytesPerMs` | `number \| null` | Throughput |
| `duration` | `number \| null` | Transfer duration (ms) |
| `isAborted` | `boolean` | Whether aborted |
| `isAbortedBySender` | `boolean` | Aborted by sender |
| `isAbortedByReceiver` | `boolean` | Aborted by receiver |
| `isTransfered` | `boolean` | All chunks received |
| `error` | `Error \| null` | Error if failed |

**Methods:**

| Method | Description |
|--------|-------------|
| `whenSetUp()` | `Promise<void>` — Resolves when setup and confirm sent |
| `abort(bySender?)` | Abort transfer; `bySender: true` when sender aborted |
| `serialize()` | Returns plain object with transfer state |

**Node only:** `pipeTo(writableStream)` — Pipe incoming stream/file data to a `Writable` stream. Available when `type` is `stream` or `file`.

### OutgoingTransport

Handles outgoing transfers. Attaches `transfer` to the WS instance.

**Constructor:** `new OutgoingTransport(ws)`

**Methods:**

| Method | Description |
|--------|-------------|
| `transfer(ws, kind, props)` | Start transfer. On server, `ws` is `WSServerClient`; on client, use `ws.transfer(kind, props)` |

### OutgoingTransfer

Represents an outgoing transfer.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `ws` | `WS \| WSServerClient` | WebSocket connection |
| `id` | `string` | Transfer ID |
| `kind` | `string` | Transfer kind |
| `type` | `string` | Detected data type |
| `collect` | `boolean` | Whether receiver buffers |
| `metadata` | `Record<string, unknown>` | Custom metadata |
| `size` | `number \| null` | Total size (null if unknown) |
| `senderProgress` | `number` | 0–1 sender progress |
| `progress` | `number` | 0–1 receiver progress |
| `transferedSize` | `number` | Bytes sent |
| `bytesPerMs` | `number \| null` | Throughput |
| `duration` | `number \| null` | Transfer duration (ms) |
| `isAborted` | `boolean` | Whether aborted |
| `isTransfered` | `boolean` | Transfer completed |
| `error` | `Error \| null` | Error if failed |

**Methods:**

| Method | Description |
|--------|-------------|
| `whenSetUp()` | `Promise<void>` — Resolves when request sent |
| `abort()` | Abort transfer |
| `serialize()` | Returns plain object with transfer state |

### Types

**IncomingTransportOptions**

| Property | Type | Description |
|----------|------|-------------|
| `sizeLimit?` | `number` | Max transfer size in bytes |

**IncomingTransferListener**

| Property | Signature | Description |
|----------|-----------|-------------|
| `begin?` | `(wssc, transfer) => unknown \| false` | Before confirm; return `false` to reject |
| `chunk?` | `(wssc, transfer, chunk) => unknown` | Each chunk received |
| `progress?` | `(wssc, transfer, chunk) => unknown` | Same as chunk |
| `end?` | `(wssc, transfer) => unknown` | Transfer complete |
| `error?` | `(wssc, transfer, error) => unknown` | On error or abort |
| `once?` | `boolean` | Remove listener after first trigger |

On client (`WS`), `wssc` is omitted; listeners receive `(transfer)` or `(transfer, chunk)`.

**IncomingTransferListenerOptions**

| Property | Type | Description |
|----------|------|-------------|
| `once?` | `boolean` | One-time listener |

**OutgoingTransferProps**

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Buffer \| File \| Readable \| object \| string` | Data to send |
| `type?` | `TransferTypes` | Force type; auto-detected if omitted |
| `incomingType?` | `TransferTypes` | Type for receiver |
| `collect?` | `boolean` | Whether receiver buffers (default: `false`) |
| `metadata?` | `Record<string, unknown>` | Custom metadata |
| `size?` | `number` | Total size (for progress) |
| `chunkSize?` | `number` | Chunk size (default: 256 KB) |
| `encoding?` | `"base64" \| "buffer" \| "utf8"` | Chunk encoding |
| `incomingEncoding?` | `"base64" \| "buffer" \| "utf8"` | Encoding for receiver |
| `onBegin?` | `(transfer) => unknown` | After receiver confirmed |
| `onSenderProgress?` | `(transfer) => unknown` | After each chunk sent |
| `onProgress?` | `(transfer) => unknown` | Receiver progress update |
| `onEnd?` | `(transfer) => unknown` | Transfer complete |
| `onError?` | `(transfer, error) => unknown` | On error or abort |

On server, callbacks receive `(wssc, transfer)` or `(wssc, transfer, error)`.

**Type helpers**

| Type | Description |
|------|-------------|
| `WithTransfer<W, WSSC>` | `W` with `transfer(wssc, kind, props)` |
| `WithOptionalTransfer<W, WSSC>` | Partial `transfer` |
| `WithOnTransfer<W, WSSC>` | `W` with `onTransfer` and `onceTransfer` |
| `WithOptionalOnTransfer<W, WSSC>` | Partial `onTransfer` / `onceTransfer` |

## Related

- [insite-ws](../ws/README.md) — provides WSServer and WS
- [insite-server](../server/README.md), [insite-client](../client/README.md), [insite-users-server](../users-server/README.md) — use transfers

## License

MIT
