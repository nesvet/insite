# insite-db

MongoDB layer for inSite — connection, collection management, Change Streams, JSON Schema validation, and indexes.

Part of [inSite](../../README.md) — used by [insite-server](../server/README.md), [insite-config](../config/README.md), [insite-users-server](../users-server/README.md), [insite-subscriptions-server](../subscriptions-server/README.md).

## Installation

```sh
npm install insite-db
```

Or:

```sh
bun add insite-db
```

## Quick Start

```ts
import { connect } from "insite-db";

const { client, db, collections } = await connect({
	url: "mongodb://127.0.0.1:27017",
	name: "myapp"
});

const users = await collections.ensure("users", {
	schema: { /* JSON Schema */ },
	indexes: [[{ email: 1 }, { unique: true }]]
});
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `connect` | function | Connects to MongoDB |
| `Collections` | class | Map-like manager with `ensure()` |
| `newObjectIdString` | function | New ObjectId as string |
| `printChangeStreamChangeDetails` | function | Log change (masks sensitive data) |
| `printChangeStreamError` | function | Log Change Stream error |
| `DB` | type | `Db` from mongodb |
| `CollectionSchema` | type | `JSONSchema4` |
| `Options` | type | MongoClientOptions & url, name, onConnect |
| `CollectionOptions` | type | Options for `ensure()` |
| `CollectionIndexes` | type | `[IndexSpecification, CreateIndexesOptions?][]` |
| `ChangeStreamListener<TSchema>` | type | `(doc: ChangeStreamDocument<TSchema>) => void` |
| `WatchedCollection<Doc>` | type | Collection with change stream methods |
| (full mongodb package) | — | Re-exported |

### connect(options)

```ts
function connect(options: Options): Promise<{ client: MongoClient; db: DB; collections: Collections }>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | MongoDB connection string |
| `name` | `string` | Database name |
| `onConnect` | `(collections, db) => Promise<void>` | Optional callback after connect |
| `...mongoClientOptions` | `MongoClientOptions` | Passed to MongoClient |

Note: `localhost` in URL is replaced with `127.0.0.1`.

### Collections

`class Collections extends Map<string, Collection>`

| Property | Type | Description |
|----------|------|-------------|
| `db` | `DB` | Raw MongoDB Db instance |

**ensure(name, options?)**

Gets or creates collection. With `watch: false`, returns plain `Collection`.

**CollectionOptions:** schema, indexes, blockCompressor, watch (default true), fullDocument (default true), quiet

### Collection extensions (WatchedCollection)

| Method | Description |
|--------|-------------|
| `ensureIndexes` | Create indexes if missing |
| `changeStream` | Change Stream instance |
| `onChange`, `prependChange` | Add change listener |
| `onceChange`, `prependOnceChange` | One-time listener |
| `removeChangeListener` | Remove listener |

## Environment

`NODE_ENV=development` — change stream events logged unless `quiet: true`. `LOGS_MASK_SENSITIVE`, `LOGS_MASK_PII`, `LOGS_MASK_SKIP` — field patterns for masking.

## Related

- [insite-server](../server/README.md), [insite-config](../config/README.md), [insite-users-server](../users-server/README.md), [insite-subscriptions-server](../subscriptions-server/README.md)

## License

MIT
