# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.6.0] - 2026-10-24

### Changed

- Packages are 2.6.0 and depend on each other through `^2.6.0`. `insite-client-react` stays at 1.1.2.
- `engines.node` is `>=22.0.0`. `engines.bun` is `>=1.4.4`. Server bundles target `node22`. Browser bundles target `es2022`. `@types/node` is `^22.20.5`.
- `getRemoteAddress` returns a pure IPv6 address as IPv6. An IPv4 address and `::ffff:x.x.x.x` stay four octets. The session `remoteAddress` pattern accepts that IPv6 form.
- `sessionsLimit` trims only when it is a number. A missing limit no longer means 0.

### Fixed

- A failed MongoDB `connect` logs and throws. `Collections.ensure` rejects when creation fails.
- Static files resolve inside the configured directory. A stream error after the headers destroys the response. The HTML template escapes text, attributes, and `<` inside inline JSON.
- `parseCookie` splits on the first `=`. The set-cookie token is 32 random bytes. `onSet` runs on `finish`. `name`, `value`, `domain`, and a string `path` cannot contain `;`, CR, LF, or NUL.
- `updateUser` hashes a new password in the same update and deletes that user's sessions only when the stored hash changes. `updateRole` runs `abilities` through `adjust`. Avatar save rejects a type other than WebP and a payload over 512 KiB. Login of an unknown email verifies a dummy hash, then throws `usernotfound`.
- Closing a session clears every socket on it, including the user-socket map.
- Transfer frames apply only to the socket that owns the transfer. Chunk bytes stop at the size limit. Invalid JSON on an object transfer reports the parse error.
- A subscription checks `match` again when `fullDocument` no longer matches, queues changes until the initial set, and clears its flush timer on cancel. Map sort walks the fields in process. It does not inject a script.
- A user added on the client is written at `addedUserIndex`.
- `insite-cookie` refreshes the session cookie on a later visit, at most once a day, so its `Max-Age` slides with the session.

## [2.5.0] - 2026-10-23

### Changed

- Packages on the 2.4 line are released as 2.5.0 and depend on each other through `^2.5.0`. `insite-client-react` stays at 1.1.2.
- `insite-ws` no longer adapts the Bun socket. Bun 1.4.4 creates a subclass of the `WebSocket` passed to `WebSocketServer` and delivers an `Error` on the server `error` event.

## [2.4.0] - 2026-02-16

### Changed

- All packages consolidated from separate repos into one TypeScript/Bun monorepo.

[Unreleased]: https://github.com/nesvet/insite/compare/2.6.0...HEAD
[2.6.0]: https://github.com/nesvet/insite/compare/2.5.0...2.6.0
[2.5.0]: https://github.com/nesvet/insite/compare/2.4.0...2.5.0
[2.4.0]: https://github.com/nesvet/insite/releases/tag/2.4.0
