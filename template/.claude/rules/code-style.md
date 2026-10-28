# Code style

The style is strict, and lint enforces almost all of it. The rules are in `eslint.config.mjs`, and the reasons are in `decisions.md`.

## Rules

- No comments, JSDoc included. Names and small functions explain the code. Lint lets through only a few tool directives, like `@ts-expect-error`.
- `eslint-disable` comments are switched off. Change the code, not the rule.
- Use arrow functions everywhere. A default export is a named arrow function: `const Home = () => ...`, then `export default Home` at the end of the file. No `export default function`, and no anonymous default export.
- Arrow functions can't be generators, so write those as `const name = async function* () {}`.
- No classes. Using a library's class with `new` is fine, like `new PrismaClient()`. For errors, use `new Error("Order not found", { cause })` instead of a custom error class.
- No `let` and no loops (`for`, `while`). Use `map`, `filter`, `reduce` and `const`.
- Never change a parameter or its properties. Build a new value instead.
- No `else`. Return early instead. Nested ternaries fail too, and so does a negated condition with two branches, like `!isReady ? a : b`.
- Return a value straight away. Don't put it in a variable only to return it on the next line, and return a boolean expression instead of `if (isPaid) return true; return false`.
- Inline callbacks are expressions: `orders.map((order) => order.total)` is fine, but a callback with a `{ ... }` body must become a named function. The same goes for JSX handlers like `onClick`. Callbacks passed to a hook, like `useEffect`, are the exception.
- A function that uses nothing from the function around it moves to the top level of the file.
- No `console`. Use the logger, as in `architecture.md`, "Logging".
- Import Zod as `import * as zod from "zod"`. The short-name rule rejects `z`.
- Import from `src/` with the `@/` alias, like `@/services/orders`.
- Check data from outside with Zod once, where it comes in. TypeScript runs in strict mode.
- Processes are built step by step, as shown in `architecture.md`, "Writing a service".

## Names

- Clear names. At least 3 characters and at most 40. `id`, `ok` and `_` are the only short names allowed.
- No abbreviations, like `btn`, `msg` or `err` for a variable. `props`, `params`, `ref`, `env` and `args` are allowed.
- No vague names: `data`, `result`, `res`, `ret`, `item`, `obj`, `val`, `tmp`, `temp`, `info`, `stuff`, `thing`, `handle`, `handler`, `process`, `manager`, `helper`, `util`, `utils`, `cb`, `fn`, `func`, `arr`, `str`, `num`, `flag`, `foo` or `bar`. The ban matches the whole name, so `data` fails and `orderRows` passes.
- No type prefixes, like `strName`, `arrOrders`, `fnSave` or `blnDone`.
- Types, interfaces and enums are in PascalCase, with no `I`, `T` or `E` prefix: `Order`, not `IOrder`.
- These checks cover names we declare: variables, functions and parameters. Object keys are free, because libraries set some of them, like the `data` key in Prisma's `create`.
- Tests may use vague names. The type-prefix ban still applies there.

## Size and shape

- Functions have 8 statements at most. Lines aren't counted, so a long Prisma query or an object spread over many lines is fine.
- Components (`.tsx` files) can have 10 statements and a complexity of 10 per function, and each function can run up to 300 lines. Split them into sections where it makes the screen easier to follow, not just to make them shorter.
- Outside `.tsx` files, a function's complexity is 3 at most. Its cognitive complexity is 5 at most everywhere.
- At most 3 parameters. Pass an object when you need more.
- One level of nesting, and callbacks nested at most 2 deep.
- At most 2 `&&`, `||` or `? :` operators in one expression. Give a longer condition a name.
- Tests have no statement limit, may use block callbacks and an `else` that doesn't follow a `return`, and can nest callbacks 4 deep. The other limits still apply.
- Config files in the project root, like `next.config.ts` or `vitest.config.mts`, skip the size, complexity and shape rules, and the short-name and abbreviation checks, because their shape is set by the tool that reads them.

## Constants and file order

- Constants that hold a plain value are written in capitals, like `ORDER_PAGE_SIZE` or `UTC_SESSION_TIMEZONE`. A plain value is a string, number or boolean, a sum or template built from those and other constants, or a list or object made only of them.
- Lint checks the capitals by type: every top-level `const` that holds a string, number or boolean must be in capitals. So a value worked out when the file loads is in capitals too when it's one of those, like `DATABASE_URL = environment.DATABASE_URL`, or `RUN_ID = randomUUID()` in a test.
- Everything else at the top level keeps its camelCase name: Zod schemas, `new` instances, `globalThis` holders, functions, components, and values worked out by calling a function, like `environment = readEnvironment()`. Next's own export names, like `metadata`, `dynamic` and `revalidate`, stay as Next spells them.
- The capitals check needs type information, so `eslint.config.mjs` turns on TypeScript's project service, and root `.js` and `.mjs` files join it through `allowDefaultProject`. Linting one file takes a few seconds longer because of it.
- File order: imports, then plain constants in capitals, then the main process, then its helpers below it. In tests, the constants go after the `vi.mock` calls.
- Values worked out when the file loads by calling a helper in the same file, like `environment = readEnvironment()` or the shared Prisma client, go at the very bottom, after the helpers they call. Arrow functions aren't hoisted, so if one sits above those helpers, the app crashes on start. A value read from one of them, like `DATABASE_URL = environment.DATABASE_URL`, stays below it.

## Screens

These apply to `.tsx` files. The rest of the screen rules are in `.claude/rules/screens.md`.

- Use shadcn's components, not raw `<button>`, `<input>`, `<textarea>`, `<select>`, `<table>` or `<dialog>`. Only `button` is installed so far. Add a missing one with `pnpm dlx shadcn@latest add <name>`.
- Don't restyle a shadcn component with `className`. Only layout classes are allowed on it. Use its variants and sizes instead.
- Colors come from the theme in `globals.css`, like `bg-primary` or `text-muted-foreground`, never raw ones like `bg-blue-500`.
- No arbitrary values, like `p-[13px]`, except for layout. No inline styles and no `<style>` elements.
- Only classes Tailwind can generate. Class names are static strings lint can read, never built like `` `bg-${color}` ``.
- No conflicting or duplicate classes. Classes use their canonical names and a consistent order. These checks read `src/app/globals.css` as Tailwind's entry point.

## Formatting

- Biome formats the code, and ESLint lints it. Biome's linter is off, so ESLint stays the one linter. The settings are in `biome.json`.
- Lines are up to 120 characters, with 2-space indents, double quotes, no semicolons and trailing commas. Arrow parameters always have parentheses. Biome also sorts the imports.
- Biome formats TypeScript, JavaScript, JSON and CSS.
- Formatting runs by itself on every file Claude edits, before lint. One hook, `.claude/hooks/format-on-edit.sh`, runs Biome and then ESLint on the file, so the two never race on the same file. VS Code formats on save with Biome too.
- Formatting is applied straight away, because it only moves code around and never changes names or what the code does.
- `pnpm format` formats the whole project. `pnpm format:check` only checks, and CI runs it first.
- shadcn's files (`src/components/ui/` and `src/lib/utils.ts`) and Prisma's generated code aren't formatted. The vendored paths in `biome.json` must match the `VENDORED` list in `eslint.config.mjs`. Change both together.
- Tailwind's `@theme`, `@source` and `@custom-variant` lines need `css.parser.tailwindDirectives` in `biome.json`. Without it, Biome can't read `globals.css`.

## Linting

- ESLint 9 with Next's rule sets (`core-web-vitals` and `typescript`) plus our own rules, set up in `eslint.config.mjs`. The import rules between folders are in `architecture.md`, "How a request flows".
- `next lint` no longer exists, and `next build` doesn't lint. Run `pnpm lint` yourself. CI runs it too.
- Every rule is an error, never a warning. `pnpm lint` passes only when it finds nothing.
- `pnpm lint` also runs `pnpm lint:prisma`: `prisma format --check`, `prisma validate`, then prisma-lint with the rules in `.prismalintrc.json`. Those rules are in `.claude/rules/database.md`.
- Lint runs by itself on every code file Claude edits, and the Prisma checks run on every `.prisma` file Claude edits. Claude must fix everything they report before moving on.
- Lint never auto-fixes. Claude chooses the fix, because auto-fix picks mechanical names, like turning `tmp` into `temporary`.
- Claude Code loads hooks when a session starts. After changing `.claude/settings.json`, restart the session or apply the change in `/hooks`.
- shadcn's files (`src/components/ui/` and `src/lib/utils.ts`) only follow Next's own rules. They're the `VENDORED` list in `eslint.config.mjs`. `src/db/generated/` is written by Prisma and isn't linted at all.

## Checks

Run these before calling a change done, in the order CI runs them:

- `pnpm format:check`, or `pnpm format` to fix the formatting
- `pnpm lint`, which includes the Prisma checks
- `pnpm exec next typegen && pnpm exec tsc --noEmit` for the types. `next typegen` writes the route types, like `PageProps` and `LayoutProps`, that `tsc` needs.
- `pnpm test`, or `pnpm test:coverage` for coverage as CI runs it. Tests that touch the database need `DATABASE_URL` in `.env` and the migrations applied with `pnpm db:migrate`. The rules are in `.claude/rules/testing.md`.
- `pnpm build`, which CI runs as a separate job

Fix everything the checks report before moving on.
