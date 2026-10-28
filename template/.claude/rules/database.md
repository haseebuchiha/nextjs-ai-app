---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - ".prismalintrc.json"
  - "src/models/**"
  - "src/db/**"
---

# Database rules

These cover the Prisma schema, the models and the database client. The main rules are in `architecture.md` and `code-style.md`.

## Naming

prisma-lint checks these, using `.prismalintrc.json`.

- Database naming: model names are singular PascalCase, like `OrderItem`, mapped to a snake_case table name with `@@map("order_item")`. Fields are camelCase, mapped to snake_case columns with `@map("unit_price")`. Enum names are PascalCase.
- Every model starts with `id`, then `createdAt`, and `createdAt` has an index. Every field whose name ends in `At` is a `DateTime` stored as `@db.Timestamptz`.
- Don't use prisma-lint's ignore comments (`///`). They are comments, and comments are banned.

## Checks

- `pnpm lint` also checks the database schema. Editing a `.prisma` file runs those checks by themselves, through a Claude Code hook, and the edit isn't done until they pass.
- The checks are `pnpm lint:prisma`: `prisma format --check`, then `prisma validate`, then `prisma-lint prisma/schema.prisma`. If only formatting fails, run `pnpm exec prisma format`.

## Prisma setup

- Prisma is on version 7: `prisma`, `@prisma/client` and `@prisma/adapter-pg`, all at `^7.10.0`. Keep the three on the same version. Don't move to Prisma 8 until it has a stable release.
- The schema uses the `prisma-client` generator. The client is generated into `src/db/generated/`. It isn't committed or linted. `pnpm install` regenerates it, because the `postinstall` script runs `prisma generate`.
- Server code imports Prisma's types from `@/db/generated/client`. Browser-side code imports them from `@/db/generated/browser`, which carries no server code. A row type that browser code uses, kept in `src/lib/`, is built from the browser type.
- `src/db/client.ts` holds the one shared client, exported as `database`. It uses the Postgres driver adapter and is cached on `globalThis`, so reloads in development reuse it.
- The client forces each session's timezone to UTC (`options: "-c timezone=UTC"`), because `@prisma/adapter-pg` assumes Postgres sends and receives timestamps in UTC. On a server in any other timezone, times are off by that zone's offset. Don't remove it.
- Only files in `models/` import the Prisma client. Lint blocks it everywhere else, except in test files. Type-only imports from `@/db/generated` are fine in any layer.
- Models only talk to the database. They make no decisions and never call services, jobs or anything above them.
- A model's query fields say what they do to the query, not what they mean. `OrderListQuery.onlyWithPaidAt` keeps rows whose `paidAt` is set. The service maps a `paidOnly` filter to it, so what "paid" means stays in the service.
- `prisma.config.ts` reads `DATABASE_URL` straight from the environment, because it runs outside the app. It's the one exception to "only `config/env.ts` reads environment variables".
- Store a loose outside payload, like a third-party API's response, in a `jsonb` column. Keep the fields you filter on as ordinary columns so they can be indexed.

## Migrations

- `pnpm db:migrate` creates and applies a migration. It runs `prisma migrate dev`. In Prisma 7 it no longer regenerates the client, so run `pnpm exec prisma generate` after changing the schema.
- In a non-interactive shell, like an agent's, `prisma migrate dev` stops at any data-loss warning, even with `--create-only`. Write the SQL with `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` into a new `prisma/migrations/<UTC timestamp>_<name>/migration.sql`, apply it with `pnpm exec prisma migrate deploy`, then run `prisma generate`.
- `prisma migrate dev` refuses a required column without a default on a table that has rows. Make the migration with `--create-only` and edit it by hand: add the column as nullable, fill it in SQL, then set `NOT NULL`. Stop the running app before applying a migration like it: an old process inserts rows without the column and fails.
- CI and production apply the committed migrations with `pnpm exec prisma migrate deploy`. It never creates new ones.

## Tables

- List each table here once it exists: what one row stands for, which service writes it, and anything the schema alone doesn't say.
- Status-like fields, like an order's `status`, are plain strings, not Postgres enums. The services decide their values.
- The foreign keys are `ON DELETE RESTRICT`. Delete a row's children before the row, like an order's items before the order. Tests do this in their clean-up too.
