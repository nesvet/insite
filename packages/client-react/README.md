# insite-client-react

[![npm](https://img.shields.io/npm/v/insite-client-react)](https://www.npmjs.com/package/insite-client-react)

React components for displaying subjects (users and organizations), context menus, and collapse animations.

Part of [inSite](../../README.md) — uses [insite-users-client](../users-client/README.md) for Subject live updates.

## Installation

```sh
npm install insite-client-react
```

Or:

```sh
bun add insite-client-react
```

## Requirements

**Bundler aliases** (resolve in your build config):

- `$styles` — object with `createStyles` and `theme` for styling
- `$app` — object with `usersSubscriptionGroup` (used by Subject for live updates; from [insite-users-client](../users-client/README.md))

**Host app dependencies:** Subject and ContextMenu use Material UI v4 (`@material-ui/core`) and `@nesvet/missing-mui4-components`. Install these in your app.

## Quick Start

```jsx
import { Collapse, Subject, ContextMenu, ContextMenuItem } from "insite-client-react";

<Collapse in={isOpen}><p>Content</p></Collapse>
<Subject for={user} size="m" />

const menuRef = useRef();
<div onContextMenu={(e) => menuRef.current?.open({ event: e })}>Right-click me</div>
<ContextMenu ref={menuRef}>
  <ContextMenuItem onClick={handleCopy}>Copy</ContextMenuItem>
</ContextMenu>
```

## API Reference

### Exports

| Import | Contents |
|--------|----------|
| `insite-client-react` | All components and shared utilities |
| `insite-client-react/Subject` | Subject, Avatar, Details, EditableAvatar, AvatarDialog |
| `insite-client-react/ContextMenu` | ContextMenu, Item, Divider, SubMenuItem, Title |

### Shared

**Types:** `PolymorphicRef<C>`, `PolymorphicProps<C, Props>`, `PolymorphicComponent<Default, Props>`

**css:** `createSheet(css: string): SheetAccessor` — lazy singleton for adopted stylesheets; `useSheet(getSheet, root?)` — mounts/unmounts sheet in layout effect

**env:** `isDev: boolean` — `process.env.NODE_ENV !== "production"`

### Collapse

Polymorphic collapse component with CSS transitions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `in` | `boolean` | — | Open state |
| `orientation` | `"both" \| "horizontal" \| "vertical"` | `"vertical"` | Collapse direction |
| `fade` | `boolean` | — | Fade opacity when closed |
| `as` | `ElementType` | `"div"` | Polymorphic root element |
| `className` | `string` | — | Additional class |
| `style` | `CollapseCSSVars & CSSProperties` | — | Override `--is-collapse-duration`, `--is-collapse-easing` |

### Subject

Composite layout for user or org: avatar plus details.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `for` | `User \| Org` | `{}` | Subject data |
| `vertical` | `boolean` | — | Vertical layout |
| `size` | `"xxs" \| "xs" \| "s" \| "m" \| "l" \| "xl"` | `"m"` | Size preset |
| `name` | `boolean` | `true` | Show name |
| `title` | `boolean` | `true` | Show title (org) |
| `job` | `boolean` | `true` | Show job (user) |
| `avatar` | `boolean \| ReactNode` | `true` | Avatar slot |
| `details` | `boolean` | `true` | Details slot |
| `online` | `boolean` | `true` | Show online indicator |
| `tooltip` | `boolean` | `false` | Avatar tooltip |
| `disableAutoUpdate` | `boolean` | — | Disable subscription updates |
| `AvatarProps` | `object` | — | Passed to Avatar |
| `DetailsProps` | `object` | — | Passed to Details |

**Avatar** — user or org avatar. Props: `for`, `size`, `online`, `tooltip`, `disableAutoUpdate`

**Details** — user or org details. Props: `for`, `vertical`, `size`, `name`, `job`, `title`, `disableAutoUpdate`

**EditableAvatar** — avatar with dropzone and context menu (upload/delete). Props: `person`, `size`, `online`, `editable`, `disablePortal`, `ws`, `dialog`, `self`, label strings

**AvatarDialog** — modal for cropping and rotating avatars. Uses `ws.transfer()` and `react-avatar-editor`

**Subject data shape:** User — `{ _id, name: { first, last }, job, displayLabel, initials, avatarUrl, isOnline }`; Org — `{ _id, title, displayLabel, initials, avatarUrl, isOrg: true }`

### ContextMenu

Imperative menu. Open via `ref.open({ event, anchor, prepend, append, onClose }, context)`.

| Prop | Type | Description |
|------|------|-------------|
| `contextField` | `string` | Default `"ctx"` — field on ref that holds context |
| `children` | `ReactNode \| (context, menu) => ReactNode` | Menu content |
| `onOpen` | `() => void` | Called when opened |
| `onClose` | `() => void` | Called when closed |

**ContextMenuItem** — menu item. Props: `label`, `children`, `onClick`, and other MenuItem props

**ContextMenuDivider** — visual separator

**ContextMenuTitle** — section title. Props: `children`, `className`

**ContextMenuSubMenuItem** — item that opens nested submenu. Props: `label`, `children` (submenu items), `MenuProps`, `onClick`

## Usage Examples

```jsx
import { Collapse } from "insite-client-react";
<Collapse in={isOpen}><p>Content that expands and collapses</p></Collapse>

import { Subject } from "insite-client-react";
<Subject for={user} size="m" />

import { ContextMenu, ContextMenuItem } from "insite-client-react";
const menuRef = useRef();
<div onContextMenu={(e) => menuRef.current?.open({ event: e })}>Right-click me</div>
<ContextMenu ref={menuRef}>
  <ContextMenuItem onClick={handleCopy}>Copy</ContextMenuItem>
  <ContextMenuItem onClick={handlePaste}>Paste</ContextMenuItem>
</ContextMenu>
```

## Related

- [insite-client](../client/README.md) — SDK that provides WS and users
- [insite-users-client](../users-client/README.md) — usersSubscriptionGroup for Subject

## License

MIT
