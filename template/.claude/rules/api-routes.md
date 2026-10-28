---
paths:
  - "src/app/api/**"
---

# API route rules

These cover the REST endpoints. The main rules are in `architecture.md` and `code-style.md`.

## Writing a route

- An API route file stays thin: read the request, call one service, return the result.
- Routes call services, never models or the database. Lint enforces this. See "How a request flows" in `.claude/rules/architecture.md`.
- Write handlers as named arrow functions: `export const GET = async (request: Request) => ...`.
- Type a dynamic route's second argument with Next's `RouteContext`, like `context: RouteContext<"/api/orders/[id]">`. `next typegen` writes these types, and CI runs it before `tsc`.
- Our own pages don't call the API routes. A server page calls the same services directly. The routes are for browser code that has to send or fetch something after the page loads, for outside callers using curl, and for tests.

## Reading input

- Zod checks every value a route reads: path params, the query string and the body.
- A route's `:id` is read by a small parser in `src/lib/`, like `parseOrderId` in `src/lib/order-id.ts`, which the `/orders/:id` page shares. An id that doesn't read as a whole number from 1 to 2147483647 returns 400. A missing row returns 404.
- An id that's an opaque token, not a number, works differently: one that can't be read returns 404, not 400, with the same body as an unknown one. A malformed token is just one that doesn't exist.
- A body that isn't JSON, or fails the check, returns 400 with a message that says what's expected. Nothing reaches the service.
- A query string value that can't be read at all returns 400 with a message that says what's expected.
- A time with no offset is read in the server's time zone, so examples and tests always use `Z`.

## Responses

- An error returns `{ "error": "<message>" }`, like `{ "error": "No order with id 7" }`.
- When a service throws because a row is missing, the route recognises that one error and returns 404. Any other error goes through to Next's 500.
- A list route returns its rows under a name, like `{ orders }`, not as a bare array.
- A route that creates a row returns it with status 201.

## Caching

- A route that reads its params, query or body has no `dynamic` export. Route handlers aren't cached by default, and `force-dynamic` would need replacing if Cache Components is turned on.
- A `GET` handler that reads nothing from the request is the exception. It exports `dynamic = "force-dynamic"`, so `next build` never prerenders it with build-time data. If Cache Components is turned on, swap it for `await connection()`.
