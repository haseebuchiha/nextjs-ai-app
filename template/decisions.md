# Decisions

## Setup decisions

### Stack

- Next.js 16 with the App Router, React 19 and TypeScript, scaffolded by `create-next-app` with code under `src/`, because pages, API routes and timed jobs ship as one app, and `src/` keeps application code apart from the config files at the root.
- pnpm as the package manager, because it installs faster than npm and its lockfile is strict.
- `pnpm-workspace.yaml` lists the packages allowed to run install scripts (`onlyBuiltDependencies`, for Prisma) and the ones skipped on purpose (`ignoredBuiltDependencies`), because pnpm 10 blocks dependency install scripts by default.
- `next.config.ts` reads `distDir` from `NEXT_DIST_DIR`, defaulting to `.next`, because a production build can then go into a side folder while the running app keeps serving the old one.

### Folders and layers

- Folders are split by what the code does, the Rails way: `app/` holds only pages and API routes, `services/` what the app does, `models/` database reads and writes (one file per table), `jobs/` timed work, `config/` settings and the logger, `db/` the Prisma client, `components/` and `hooks/` the screen, and `lib/` small helpers with no server or browser dependencies, because each kind of code then has exactly one place that people and AI agents can find, and Next doesn't impose a layout of its own.
- Pages, API routes and jobs each call one service function that reads top to bottom as a list of steps, and calls only go down or sideways, never up, because one function then shows a whole process.
- Models only read and write the database and make no decisions, and only models import the Prisma client, because a change to a table then touches one file.
- A service file is a long module that holds a whole area of work and exports only what other code calls, because splitting every helper into its own file means jumping between files to follow one process.
- When a page or route needs a model read unchanged, the service re-exports it under the model's name instead of wrapping it, because that keeps one name end to end while pages and routes still import only from services.
- ESLint's built-in `no-restricted-imports` enforces the layers (type-only imports are allowed, and tests may load the database client), because a written-down architecture alone doesn't stop a page from reaching into the database, and the built-in rule does the job without a new package.
- Every file in `services/`, `models/`, `jobs/`, `db/` and `config/` starts with `import "server-only"`, because the build then fails if browser code imports one.
- Pages load data on the server by calling services directly, not their own API routes, because Next recommends fetching on the server, the page has its data on first load, and it skips a network trip.
- API routes instead of server actions, with each route file kept thin (read the request, call one service, return the result), because a route can be called with curl, tested like any endpoint and reached from outside the app, which a server action can't.

### Settings and logging

- `src/config/env.ts` is the only file in `src/` that reads environment variables, because it checks them all with Zod when it loads and stops the app with a clear message if one is wrong; root config files like `prisma.config.ts` and the `NEXT_RUNTIME` check in `instrumentation.ts` are the only exceptions.
- Settings are exported from `config/env.ts` in capitals, under the same names as their environment variables (`DATABASE_URL`, `LOG_LEVEL`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), because lint requires capitals on every top-level string, number or boolean constant, including values read at load time; add each new setting to `.env.example` too.
- Zod checks environment variables and request input, because one library covers both jobs, turns each check into a TypeScript type, and is what shadcn's forms and the AI SDK expect.
- Zod is imported as `import * as zod from "zod"`, because the short-name lint rule rejects `z`.
- One shared pino logger in `src/config/logger.ts`, writing one JSON line per event to standard output, with `console` banned by lint and `onRequestError` in `src/instrumentation.ts` sending every uncaught server error to it, because `console` has no levels or structure, and Next lists pino among the packages that work with no setup.
- `pnpm dev` pipes its output through pino-pretty instead of using pino's `transport` option, because the transport runs in a separate thread that breaks under Next's bundler; so set the port with `PORT=3107 pnpm dev`, not `--port`, which would go to pino-pretty.

### Database

- PostgreSQL through Prisma, because Prisma gives typed queries, migrations kept in the repo and one schema file, and Postgres keeps loose JSON in `jsonb` columns while fixed fields stay ordinary indexed columns.
- Prisma stays on 7.x (`prisma`, `@prisma/client` and `@prisma/adapter-pg`), because npm's newest `prisma` was an 8.0 release candidate that didn't match `@prisma/client` and may break between releases; revisit when Prisma 8 is stable.
- The Prisma 7 layout: `prisma.config.ts` at the root, the Postgres driver adapter, and the generated client in `src/db/generated/`, because that is the setup Prisma 7 expects; the generated client isn't committed, linted or formatted, and the `postinstall` script rebuilds it on every install.
- `prisma.config.ts` reads `DATABASE_URL` straight from the environment, because it runs outside the app.
- Run `pnpm exec prisma generate` after every schema change, because Prisma 7's `migrate dev` no longer regenerates the client.
- In a non-interactive shell, write a migration with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` and apply it with `prisma migrate deploy`, because `prisma migrate dev` stops at any data-loss warning there, even with `--create-only`.
- `src/db/client.ts` holds the one shared client, cached on `globalThis`, because reloads in development then reuse it.
- Every database session runs in UTC (`options: "-c timezone=UTC"` on the adapter), because `@prisma/adapter-pg` assumes Postgres sends and receives timestamps in UTC, so on a server in any other time zone saved times are off by its offset; setting it in the client holds on every machine, unlike a database setting.
- prisma-lint enforces the schema's naming: singular PascalCase models mapped to snake_case tables, camelCase fields mapped to snake_case columns, every model starting with `id` and then an indexed `createdAt`, and every field ending in `At` a `DateTime` stored as `Timestamptz`, because a plural table name or a missing `createdAt` is cheap to catch now and expensive to rename once data exists.
- `pnpm lint` also runs `prisma format --check`, `prisma validate` and prisma-lint, and editing the schema runs them straight away, because the schema is code too.
- CI and production apply migrations with `prisma migrate deploy`, because it only applies committed migrations, while `migrate dev` would try to create new ones.

### Code style and lint

- ESLint 9 with Next's `core-web-vitals` and `typescript` rule sets plus our own rules, because Biome's linter would replace Next's rules and has no rule for abbreviations, and oxlint lacks the naming and syntax rules.
- Stay on ESLint 9, with plugins pinned to versions that work with it, because Next's rule set doesn't support ESLint 10 yet.
- Every rule is an error, `pnpm lint` runs with `--max-warnings 0`, and `eslint-disable` comments are switched off, because the fix is to change the code, not the rule.
- Run `pnpm lint` yourself and in CI, because `next lint` no longer exists and `next build` doesn't lint.
- No comments, enforced by a local lint rule that only lets tool directives through, because names and small functions explain the code, and AI-written code tends to add comments that repeat it.
- Clear names: at least 3 characters, no abbreviations like `res` or `tmp`, no vague words like `data`, `result` or `item`, and no type prefixes like `strName` or `IUser`, because AI-written code drifts toward vague names; object keys are exempt, because libraries set some of them, like Prisma's `data`.
- Functions have at most 8 statements and no line limit, with complexity 3, nesting depth 1 and 3 parameters at most, because short functions read as a list of steps, and a line limit punished code the formatter spreads over many lines.
- Functions in `.tsx` files get up to 300 lines, 10 statements and complexity 10, because components are mostly markup, which takes lines without adding logic.
- No `else` (use an early return), no nested ternaries, no `let`, no loops, inline callbacks are expressions and JSX handlers are named functions, because each function then stays a flat list of steps.
- Arrow functions only, with a default export written as a named arrow followed by `export default Name`, because one way to write functions leaves less to decide and keeps the code consistent whoever writes it.
- No classes, and errors are `new Error(message, { cause })`, because a clear message and a `cause` carry what a custom error class would, and error classes are where classes creep back in.
- Each file is ordered: imports, plain constants in capitals, the main process, its helpers, and last any value worked out by calling a helper in the same file, because arrow functions aren't hoisted, so a value computed above its helpers crashes the app on start.
- Every top-level `const` holding a string, number or boolean is in capitals, checked by type with `@typescript-eslint/naming-convention`, because capitals mark fixed values wherever they're used and a type check catches new constants without a list of names; it needs type information, so ESLint runs TypeScript's project service.
- shadcn's files (`src/components/ui/` and `src/lib/utils.ts`) are the `VENDORED` list, which only gets Next's own lint rules and isn't formatted by Biome, because shadcn's generated code doesn't follow our style; the list in `eslint.config.mjs` and the exclusions in `biome.json` must change together.
- Root config files like `next.config.ts` skip the size and complexity limits, because their shape is set by the tool that reads them.
- Type-checking is `pnpm exec next typegen && pnpm exec tsc --noEmit`, because `next typegen` writes the route types `tsc` needs without waiting for a build.

### Formatting

- Biome formats every TypeScript, JavaScript, JSON and CSS file (120-character lines, 2-space indents, double quotes, no semicolons, trailing commas, sorted imports, all set in `biome.json`), with its linter off, because ESLint has no formatter, so without one a file's layout depends on who wrote it, and Biome is one fast binary that leaves ESLint as the one linter.
- Biome rather than Prettier, because Prettier is slower, needs more config and brings another dependency tree.
- `biome.json` turns on `css.parser.tailwindDirectives`, because otherwise Biome can't read Tailwind's directives in `globals.css`.

### Interface

- Tailwind CSS 4 with shadcn/ui on Base UI, shadcn's current default style, because shadcn copies component code into the project so we own it, and starting on the current default means no redoing components later.
- Screens use shadcn components from `src/components/ui/` (add one with `pnpm dlx shadcn@latest add <name>`), and lint bans raw `button`, `input`, `textarea`, `select`, `table` and `dialog` elements, because every screen then stays on the shared components.
- `.tsx` files also run `@shadcn/lint` (no restyled components, raw colours, made-up values, inline styles or unknown classes) and `eslint-plugin-better-tailwindcss` (no clashing, repeated, non-canonical or out-of-order classes), because screens drift the way code does and these keep them on the shared theme.
- `@shadcn/lint` is pinned to exactly 0.2.0, because it was weeks old and changing fast; upgrade it on purpose.
- The Tailwind checker's `no-deprecated-classes` rule stays off, because its auto-fix turns `rounded` into `rounded-sm`, which is a different size in this theme.
- `globals.css` points `--font-sans` at `--font-geist-sans`, because shadcn's setup once pointed it at itself and the whole page fell back to a serif font.
- A link that looks like a button is a link with `className={cn(buttonVariants(...))}`, because screen readers then announce it as a link.
- No `loading.tsx` by default, because a loading boundary starts streaming before the page knows a record is missing, so Not found comes back with status 200 instead of 404.

### LLM

- Model calls go through the AI SDK (`ai` 7 with `@ai-sdk/openai` 4), because structured output is one call that sends a Zod schema and checks the answer, it also covers streaming and tools, it reports each call's token usage, and tests can swap in its mock model.
- The provider is `createOpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY })` with the model `LLM_MODEL`, because the default target is the local `openai-oauth` proxy, an OpenAI-compatible endpoint at `http://localhost:10531/v1`, with `gpt-5.5`.
- `LLM_API_KEY` defaults to `not-needed`, because the local proxy ignores the key but the provider won't start without one.
- Calls use the Responses API, `.responses(LLM_MODEL)`, because the local proxy's older completions route silently drops `response_format`, so the model never sees the schema; whatever `LLM_BASE_URL` points at must serve `/v1/responses`.
- Multi-turn calls set `providerOptions.openai.store: false`, because the proxy keeps no state and rejects the `item_reference` items the SDK sends otherwise.
- Only one service file imports the AI SDK provider, and other code calls its exports, because a change of provider or library then touches one file.
- AI SDK 7 calls use `instructions` (not `system`) and `generateText` with `Output.object` (not `generateObject`), because AI SDK 7 renamed the one and deprecated the other.

### Tests

- Vitest with two projects, `server` for `tests/**/*.test.ts` in Node and `components` for `tests/**/*.test.tsx` in happy-dom with Testing Library, because happy-dom is lighter and faster than jsdom, covers what component tests need, and jsdom needs Node 24.15 or newer.
- The Vitest config swaps `server-only` for an empty module, because that import throws inside Vitest and tests need to import server files.
- Vitest sets `LOG_LEVEL=silent` and a fixed `LLM_MODEL`, because test output then stays quiet and doesn't depend on what `.env` says.
- The components project pins `TZ` to `Asia/Karachi`, because a date bug that only shows away from UTC then still fails on CI's UTC runner.
- `mockReset`, `restoreMocks` and `unstubGlobals` are on, because every mock, spy and stubbed global then resets before each test without code in the test.
- Server tests run against the real Postgres in `DATABASE_URL` and mock only the edges (`fetch`, the model, browser APIs happy-dom lacks), never our own code, because the tests then check real queries, and a refactor that keeps the behaviour doesn't break them.
- Each test deletes only the rows it wrote, never a whole table, and tests that seed rows by time use far-off date windows of their own, because data in the dev database and suites running at the same time then never collide.
- No test calls a real model; tests use `MockLanguageModelV4` from `ai/test`, because tests then never reach the proxy or any model.

### CI and hooks

- GitHub Actions runs on every push and pull request: a `checks` job, with a Postgres 17 service container and Node 24, runs `pnpm install --frozen-lockfile`, `pnpm format:check`, `prisma migrate deploy`, `pnpm lint`, `next typegen`, `tsc --noEmit` and `pnpm test:coverage`, and a `build` job runs `pnpm build` alongside it, because type-checking and a build catch what format, lint and tests miss, and the service container gives each run a fresh database.
- Format, lint, types and tests share one job, because separate jobs would each install everything again for little gain on a short run.
- Coverage (V8, over `src/`) is uploaded as a workflow artifact unless the run was cancelled, not sent to a coverage service, because a service like Codecov needs an account and a token, and the artifact plus the text report in the log are enough.
- CI sets `LOG_LEVEL=silent`, because test logs then stay out of the CI output.
- A Claude Code `PostToolUse` hook runs on every Edit or Write: `format-on-edit.sh` formats the file with Biome and then lints it with ESLint, and `prisma-on-edit.sh` runs the schema checks when a `.prisma` file changes, with any failure blocking until it's fixed, because problems are caught as they're written instead of in review, which matters most for AI-written code.
- Formatting and lint run from one hook script, in that order, because matching hooks run side by side, and two separate hooks would race on the same file.
- The hooks apply Biome's formatting but never ESLint's auto-fixes, because formatting only moves code, while lint auto-fix picks mechanical names (like `tmp` to `temporary`) and its arrow-function fix can produce code that crashes on load.
- Restart the session, or apply the change in `/hooks`, after editing `.claude/settings.json`, because Claude Code loads hooks when a session starts.

## Project decisions

_New decisions for this project go here, one line each: the choice, then why._

## Open

- A pre-commit lint check, for example `simple-git-hooks` installed by a `prepare` script and running `pnpm lint`; the full lint takes seconds, so lint-staged shouldn't be needed.
- A naming check beyond lint, since lint catches bad names but not misleading ones: either require `is`, `has`, `can` or `should` on yes/no values, or have an AI review the names at the end of each task.
- Whether to stop Claude from editing the lint config.
- Browser end-to-end tests: none are set up yet, though the lint config already has rules for an `e2e/` folder.
