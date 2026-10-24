# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `insite-cookie` refreshes the session cookie on a later visit, at most once a day, so its `Max-Age` slides with the session.

## [2.5.0] - 2026-10-23

### Changed

- Packages on the 2.4 line are released as 2.5.0 and depend on each other through `^2.5.0`. `insite-client-react` stays at 1.1.2.
- `insite-ws` no longer adapts the Bun socket. Bun 1.4.4 creates a subclass of the `WebSocket` passed to `WebSocketServer` and delivers an `Error` on the server `error` event.

## [2.4.0] - 2026-02-16

### Changed

- All packages consolidated from separate repos into one TypeScript/Bun monorepo.

[Unreleased]: https://github.com/nesvet/insite/compare/2.5.0...HEAD
[2.5.0]: https://github.com/nesvet/insite/compare/2.4.0...2.5.0
[2.4.0]: https://github.com/nesvet/insite/releases/tag/v2.4.0
