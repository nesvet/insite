# inSite

[![CI](https://github.com/nesvet/insite/actions/workflows/ci.yaml/badge.svg)](https://github.com/nesvet/insite/actions/workflows/ci.yaml)
[![license](https://img.shields.io/npm/l/insite-server)](LICENSE)

Real-time apps need WebSocket, reactive data, auth, and sometimes file transfers. inSite bundles this: MongoDB Change Streams → pub/sub publications, users/orgs/roles with RBAC, cookie auth over WS, optional file transfers.

Single server entry point ([`insite-server`](packages/server/README.md)), single client entry point ([`insite-client`](packages/client/README.md)). TypeScript/Bun monorepo with React components available.

## Quick Start

**Server**

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

**Client**

```ts
import { InSite } from "insite-client";

const inSite = await InSite.init({
	ws: { url: "wss://your-server.example.com" }
}, true);
```

## Packages

| Group | Packages |
|-------|----------|
| Server | [insite-server](packages/server/README.md) |
| Client | [insite-client](packages/client/README.md), [insite-client-react](packages/client-react/README.md) |
| Transport | [insite-ws](packages/ws/README.md), [insite-http](packages/http/README.md), [insite-ws-transfers](packages/ws-transfers/README.md) |
| Data | [insite-db](packages/db/README.md), [insite-config](packages/config/README.md) |
| Users | [insite-users-server](packages/users-server/README.md), [insite-users-server-ws](packages/users-server-ws/README.md), [insite-users-client](packages/users-client/README.md) |
| Subscriptions | [insite-subscriptions-server](packages/subscriptions-server/README.md), [insite-subscriptions-client](packages/subscriptions-client/README.md), [insite-subscriptions-react](packages/subscriptions-react/README.md) |
| Shared | [insite-common](packages/common/README.md), [insite-cookie](packages/cookie/README.md) |

Entry points: [insite-server](packages/server/README.md) for backend, [insite-client](packages/client/README.md) for frontend.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
