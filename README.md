# insite-http

HTTP/HTTPS server for Node.js with middleware architecture, path-based routing, and built-in middlewares for static files and HTML templates.

Part of [inSite](../../README.md) — uses [insite-common](../common/README.md) for server creation.

## Installation

```sh
npm install insite-http
```

Or:

```sh
bun add insite-http
```

## Quick Start

```ts
import { HTTPServer } from "insite-http";

const server = new HTTPServer({ port: 3000 });

server.get("/", (request, response) => {
	response.json({ message: "Hello" });
});

server.get("/users/:id", (request, response) => {
	response.json({ id: request.params.id });
});
```

Path patterns: `:param` for named segments, `*` for wildcards. Examples: `/users/:id`, `/api/*`, `/files/:name?`

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `HTTPServer` | class | HTTP/HTTPS server |
| `StaticServer` | class | HTTPServer with StaticMiddleware pre-configured |
| `ClassMiddleware` | class | Base for custom middlewares |
| `StaticMiddleware` | class | Serves static files |
| `TemplateMiddleware` | class | HTML shell for SPAs |
| `Request` | class | Extends IncomingMessage |
| `Response` | class | Extends ServerResponse |
| `Handler`, `Next`, `Method`, `Priority`, `RegExpOrString`, `RequestParams`, `RequestQueryParams`, `Middleware`, `TupleMiddleware`, `GenericMiddleware`, `Options`, `ErrorParams`, `ErrorHandler`, `ResponseBody`, `ResponseHeaders` | types | — |

### HTTPServer

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `icon` | `string` | `"🕸️ "` | Icon for console logs |
| `name` | `string` | `"HTTP"` | Server name |
| `port` | `number \| string` | 80/443 | Port |
| `ssl` | `{ cert, key }` | — | SSL cert and key |
| `listeners` | `Partial<Record<Method \| "ALL", Listener[]>>` | — | Pre-registered listeners |
| `errors` | `Record<"default" \| number, ErrorParams>` | — | Custom error handlers |
| `server` | `http.Server \| https.Server \| ServerOptions` | — | Existing server or options |

**Properties:** server, protocol, isS

**Methods:** addRequestListener, addMiddleware, get, post, put, patch, delete, _throw

**Static:** makeProps

### ClassMiddleware

```ts
class ClassMiddleware {
	priority: number;
	listeners: Partial<Record<Method, [RegExpOrString, Handler, Priority?][]>>;
	bindTo?(server: HTTPServer): void;
}
```

### Request

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Pathname |
| `querystring` | `string` | Query string |
| `ip` | `string` | Client IPv4 |
| `params` | `Record<string, string>` | URL params |
| `query` | `Record<string, string>` | Parsed query |
| `bearer` | `string \| null` | Authorization Bearer token |
| `body` | `RequestBody` | stream(), text(), bytes(), arrayBuffer(), json(), urlEncoded() |

### Response

**Headers:** status(code), set(header, value), header

**Body:** text, json, urlEncoded, stream, give

**Errors:** error, badRequest, unauthorized, forbidden, notFound, requestTimeout, gone, internalServerError, serviceUnavailable

### StaticMiddleware

Options: src, root, path, extensions, resolved, restricted, preloaded

### TemplateMiddleware

Options: path, globals, title, css, rootId

## SSL / HTTPS

Pass `ssl: { cert, key }` or use `server` from [insite-common](../common/README.md) `createServer`. `resolveSSL` for auto certs in dev.

## Related

- [insite-common](../common/README.md) — resolveSSL, createServer
- [insite-server](../server/README.md), [insite-cookie](../cookie/README.md)

## License

MIT
