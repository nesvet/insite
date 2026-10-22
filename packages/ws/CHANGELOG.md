# insite-ws

## 2.5.0

### Changed

- Drop the Bun socket adapter. Bun 1.4.4 subclasses the `WebSocket` passed to `WebSocketServer`, and a server `error` is an `Error`. The Node `>=20` contract is unchanged. Run the server on Bun 1.4.4 or newer when Bun is the runtime.

## 2.4.1

### Patch Changes

- Initialize the request counter when adapting a Bun socket, and stop wrapping `terminate`
