# insite-subscriptions-react

[![npm](https://img.shields.io/npm/v/insite-subscriptions-react)](https://www.npmjs.com/package/insite-subscriptions-react)

React components for subscribing to inSite publications over WebSocket.

Part of [inSite](../../README.md) — requires [insite-ws](../ws/README.md) and [insite-subscriptions-client](../subscriptions-client/README.md).

## Installation

```sh
npm install insite-subscriptions-react
```

Or:

```sh
bun add insite-subscriptions-react
```

## Setup

Before using the components, bind the library to your WebSocket instance:

```ts
import { WS } from "insite-ws/client";
import { Subscription } from "insite-subscriptions-react";

const ws = new WS({ url: "wss://example.com" });
Subscription.bindTo(ws);
```

`Subscription.bindTo(ws)` wires the subscription protocol to the given `WS` instance. Without it, creating subscriptions will throw.

## Overview

**Subscription** — Single publication subscription. Supports three data shapes: object (default), array, and map. Subscribes on mount, unsubscribes on unmount. Renders via a render-prop `children(isActive, value)`.

**SubscriptionGroup** — Multiple subscriptions with shared lifecycle. Uses definition-based configuration from [insite-subscriptions-client](../subscriptions-client/README.md). Subscribes on mount, unsubscribes on unmount. Renders via `children(isLoaded, values)`.

Both components support two update modes:

- **consistent** — uses `forceUpdate()` when data changes; no `shouldComponentUpdate` override
- **inconsistent** (default for Subscription) — uses `setState({})` when data changes; `shouldComponentUpdate` returns `false` when only `publication`/`params` or `definitions` change, and renews/redefines instead of full re-render

## Public API

### Exports

| Export | Description |
|--------|-------------|
| `Subscription` | Class component for a single publication |
| `SubscriptionGroup` | Class component for multiple publications |

Both components expose static `bindTo`, which delegates to `Subscription.bindTo` from [insite-subscriptions-client](../subscriptions-client/README.md).

---

### Subscription

Class component that wraps `SubscriptionObject.WithSubscription`, `SubscriptionArray.WithSubscription`, or `SubscriptionMap.WithSubscription` depending on props.

| Prop | Type | Default | Description |
|-----|------|---------|-------------|
| `publication` | `string` | — | Publication name to subscribe to |
| `params` | `unknown[]` | `[]` | Arguments passed to the publication |
| `map` | `boolean` | — | Use `SubscriptionMap` when `true` |
| `array` | `boolean` | — | Use `SubscriptionArray` when `true` |
| `Item` | `SubscriptionMap["Item"]` | — | Custom item class for map (map only) |
| `valueRef` | `(value: Value) => void` | — | Called with the subscription value in constructor |
| `consistent` | `boolean` | — | Use `forceUpdate` instead of `setState` when `true` |
| `children` | `(isActive: boolean, value: Value) => ReactNode` | — | Render prop |
| `onUpdate` | `(value: Value) => void` | — | Called when data updates |

**Value type:** `SubscriptionObjectWithSubscription | SubscriptionArrayWithSubscription | SubscriptionMapWithSubscription` (from [insite-subscriptions-client](../subscriptions-client/README.md))

**Instance properties (via ref):**

| Property | Type | Description |
|----------|------|-------------|
| `value` | `Value` | The underlying subscription container |
| `isActive` | `boolean` | `true` when data is loaded, `false` when connection is closed |

**Instance methods (via ref):**

| Method | Description |
|--------|-------------|
| `renew(publicationName: string, params: unknown[])` | Renew subscription with new publication/params |
| `subscribe()` | Subscribe (called automatically on mount) |
| `unsubscribe()` | Unsubscribe (called automatically on unmount) |

---

### SubscriptionGroup

Class component that wraps `SubscriptionGroup` from [insite-subscriptions-client](../subscriptions-client/README.md).

| Prop | Type | Description |
|-----|------|-------------|
| `definitions` | `SubscriptionGroupUnparsedDefinition[]` | Subscription definitions (object or tuple form) |
| `target` | `object` | Object to bind subscription values to (`target[name] = value`) |
| `debounce` | `number` | Debounce ms for update events |
| `valuesRef` | `(values: SubscriptionGroupValues) => void` | Called with `group.values` in constructor |
| `consistent` | `boolean` | Use `forceUpdate` instead of `setState` when `true` |
| `children` | `(isLoaded: boolean, values: SubscriptionGroupValues) => ReactNode` | Render prop |
| `onUpdate` | `(group: SubscriptionGroup) => void` | Called when any subscription in the group updates |

**SubscriptionGroupValues:** `any[] & Record<string, any>` — array of values indexed by definition name

**Instance properties (via ref):**

| Property | Type | Description |
|----------|------|-------------|
| `group` | `SubscriptionGroup` | The underlying group instance |
| `values` | `SubscriptionGroupValues` | Current values by definition name |
| `isLoaded` | `boolean` | `true` when all subscriptions have loaded |
| `isInited` | `boolean` | `true` when all subscriptions have inited |

**Instance methods (via ref):**

| Method | Description |
|--------|-------------|
| `redefine(definitions: SubscriptionGroupUnparsedDefinition[])` | Replace definitions, reattach changed, detach removed |
| `subscribe()` | Subscribe all (called automatically on mount) |
| `unsubscribe()` | Unsubscribe all (called automatically on unmount) |

---

### SubscriptionGroup Definition Format

Each definition describes one subscription in the group. See [insite-subscriptions-client](../subscriptions-client/README.md) for full details.

**Object form:**

```ts
{
	name: string;
	type?: "object" | "array" | "map";
	publicationName?: string;  // defaults to name
	params?: unknown[];
	value?: SubscriptionObjectWithSubscription | SubscriptionArrayWithSubscription | SubscriptionMapWithSubscription;
	handle?: (updated, group) => void;
	onBeforeInit?: (value) => void;
	debounce?: number;
	preventBind?: boolean;
}
```

**Tuple form:** `[name, type?, publicationName?, params?, handle?, onBeforeInit?, debounce?, preventBind?]`

## Usage Examples

**Subscription (object):**

```tsx
import { Subscription } from "insite-subscriptions-react";

<Subscription publication="currentUser" params={[]}>
	{(isActive, value) => isActive && <div>{value.name}</div>}
</Subscription>
```

**Subscription (array) with valueRef:**

```tsx
const valueRef = useRef(null);

<Subscription
	publication="users"
	params={[]}
	array
	valueRef={(value) => { valueRef.current = value; }}
>
	{(isActive, value) => isActive && <UserList items={value} />}
</Subscription>
```

**SubscriptionGroup:**

```tsx
import { SubscriptionGroup } from "insite-subscriptions-react";

const target = {};
const definitions = [
	{ name: "users", type: "array", publicationName: "users", params: [] },
	{ name: "profile", type: "object", publicationName: "profile", params: [] }
];

<SubscriptionGroup
	definitions={definitions}
	target={target}
	debounce={8}
	consistent={false}
	valuesRef={() => {}}
	onUpdate={() => {}}
>
	{(isLoaded, values) => isLoaded && (
		<div>
			<UserList users={values.users} />
			<Profile data={values.profile} />
		</div>
	)}
</SubscriptionGroup>
```

## Related

- [insite-subscriptions-client](../subscriptions-client/README.md), [insite-ws](../ws/README.md)

## License

MIT
