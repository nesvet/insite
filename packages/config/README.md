# insite-config

[![npm](https://img.shields.io/npm/v/insite-config)](https://www.npmjs.com/package/insite-config)

Runtime configuration storage backed by MongoDB. Define a schema with defaults, read and update values in memory, persist to a `config` collection. Changes sync automatically via MongoDB change streams.

Part of [inSite](../../README.md) — requires [insite-db](../db/README.md). MongoDB must support change streams (replica set or sharded cluster).

## Installation

```sh
npm install insite-config
```

Or:

```sh
bun add insite-config
```

## Quick Start

```ts
import { connect } from "insite-db";
import { init as initConfig } from "insite-config";

const schema = {
	theme: { dark: false },
	api: { rateLimit: 100 }
};

const { collections } = await connect({ url: "...", name: "myapp" });
const config = await initConfig(collections, schema);

console.log(config.theme.dark); // false
await config.update("theme", { dark: true });
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `init` | function | Initializes config instance |
| `UnknownConfigItemError` | class | Thrown when config item ID not in schema |
| `Schema` | type | `Record<string, Record<string, boolean \| number \| string \| null>>` |
| `Config<S>` | type | Config object returned by `init()` |
| `Listener<CI>` | type | `(this: CI, updatedFields, prevFields) => void \| Promise<void>` |
| `ConfigItemID<S>` | type | String union of config item IDs |
| `Updates<CI>` | type | `Partial<Omit<CI, "_u">>` |
| `CollectionOptions` | type | Extends insite-db CollectionOptions; `fullDocument` and `watch` fixed |

### init(collections, schema, collectionOptions?)

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `collections` | `Collections` | From [insite-db](../db/README.md) `connect()` |
| `schema` | `Schema` | Object mapping config item IDs to default field values |
| `collectionOptions` | `CollectionOptions` | Optional. Passed to `collections.ensure()` for `config` |

**Returns:** `Promise<Config<S>>`. Singleton — subsequent calls return same instance.

### UnknownConfigItemError

Extends `Error`. `name`: `"UnknownConfigItemError"`

### Config&lt;S&gt;

**Indexed access:** `config[id]` — readonly config item (includes internal `_u` field)

**Methods:**

| Method | Signature | Description |
|--------|------------|-------------|
| `addListener` / `on` | `(id, listener, immediately?) => void` | Subscribe to updates. `immediately: true` calls listener once with current state |
| `removeListener` / `off` | `(id, listener) => void` | Unsubscribe |
| `update` | `(id, updates) => Promise<ConfigItem>` | Apply partial updates |

## Usage Examples

```ts
const theme = config.theme;
const isDark = theme.dark;

await config.update("api", { rateLimit: 200 });

config.addListener("theme", (updated, prev) => {
	console.log("theme changed:", updated, prev);
}, true);
config.removeListener("theme", listener);
```

**Notes:** Singleton; schema changes — removed items deleted from DB, new items created with defaults; conflict resolution via `updatedAt`.

## Related

- [insite-db](../db/README.md) — provides Collections
- [insite-server](../server/README.md) — uses config

## License

MIT
