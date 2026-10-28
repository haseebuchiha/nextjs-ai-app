---
paths:
  - "src/**/*.tsx"
  - "src/components/**"
  - "src/hooks/**"
  - "src/app/globals.css"
  - "components.json"
---

# Screen rules

These cover pages, components, hooks and styling. How the folders fit together is in `.claude/rules/architecture.md`, and the general code style in `.claude/rules/code-style.md`.

## shadcn/ui

- shadcn/ui is set up with the `base-nova` style, which builds components on Base UI, not Radix. Icons come from `lucide-react`.
- Screens use shadcn components from `src/components/ui/`, never raw `button`, `input`, `textarea`, `select`, `table` or `dialog` elements. Lint enforces this. The template ships only `button`. Add a missing one with `pnpm dlx shadcn@latest add <name>`.
- `src/components/ui/` and `src/lib/utils.ts`, which holds the `cn` helper, are shadcn's code. Don't hand-edit them. They're in the `VENDORED` list in `eslint.config.mjs`, so they only follow Next's own lint rules, and `biome.json` leaves them out, so Biome doesn't format them.
- Code copied from another component registry is vendored the same way: add its folder to `VENDORED` in `eslint.config.mjs` and leave it out of `files.includes` in `biome.json`.
- `@shadcn/lint` is pinned to one exact version because it is new and changes fast. Upgrade it on purpose, then run `pnpm lint`.
- To compare our shadcn components with the latest upstream ones, run `pnpm exec shadcn add <names> --dry-run` by hand. Don't use `shadcn diff`: it is deprecated and gives wrong answers.

## Code written for Radix

- Many registries write for shadcn on Radix. Ours is on Base UI, so copied code can break in two ways. Radix's `asChild` prop doesn't exist in Base UI, which uses `render`. And Radix marks open panels with `data-state="open"`, while Base UI uses `data-open`, `data-closed` and, on a trigger, `data-panel-open`.
- Don't copy components that use `asChild`. Use shadcn's own components, which already work on Base UI.
- When a copied component only uses `data-state`, patch its classes, like `data-[state=open]` to `data-open`. Apply the patch again after every update.
- Vendored files skip our screen rules, so they may keep raw colours.

## Styling

- Colours come from the theme in `src/app/globals.css`, like `text-muted-foreground`. Raw colours like `bg-zinc-500`, made-up values like `w-[158px]` and inline `style` all fail lint.
- shadcn's lint won't let a screen restyle a component, like `rounded-full` or `shadow-lg` on a `Button`. Keep the component's own shape and sizes, and put position or a shadow on a plain wrapper `div`.
- Tailwind classes that clash, like `p-4 p-2`, or repeat fail lint. Lint also wants classes in a set order and their shortest form; `pnpm exec eslint --fix <file>` does that for you.
- The Tailwind checker's `no-deprecated-classes` rule is left off on purpose. Its auto-fix turns `rounded` into `rounded-sm`, which is a different size in our theme. Don't switch it on.
- Fonts: `layout.tsx` loads Geist into `--font-geist-sans` and `--font-geist-mono`, and `globals.css` sets `--font-sans: var(--font-geist-sans)`. Never point `--font-sans` at itself. shadcn's setup did that once, and the whole page fell back to a serif font.
- A package that renders its own Tailwind classes needs an `@source` line for its built files in `globals.css`, like `@source "../../node_modules/<package>/dist/*.js"`, so Tailwind generates those classes.

## Components

- Components are the exception to the short-function rules. They can run up to 300 lines. Split them into sections where it makes the screen easier to follow, not just to make them shorter.
- The 300-line, 10-statement and complexity-10 limits apply to every function in a `.tsx` file, not just components. Past 10 statements, move the logic into a hook in `src/hooks/`.
- A component is a named arrow function. Type its props directly. Don't use `React.FC`.
- A generic component needs a trailing comma in `.tsx`: `const SortableList = <Entry,>(...) => ...`.
- React 19 passes `ref` as a normal prop, so don't use `forwardRef`. For `memo`, wrap a named component, like `memo(ProjectRow)`, never `memo(() => ...)`.
- Event handlers in JSX are named functions. An inline callback with a `{ }` body fails lint, except inside a hook call like `useEffect`.
- `layout.tsx` wraps every page in one `<main>`. Pages render straight into it, without one of their own, and so do `not-found.tsx` and `error.tsx` when you add them. `global-error.tsx` replaces the whole layout, so it keeps its own.
- Display helpers used by more than one component, like a date or duration formatter, live in one shared file in `src/components/`, not in each component.
- Components, hooks and `src/lib/` can run in the browser. They never import `services/`, `models/`, `jobs/` or `config/`, and lint enforces it. They get data as props from a page, or from an API route.
- Browser-side code imports Prisma types from `@/db/generated/browser`, as type-only imports. Only server code imports from `@/db/generated/client`.
- A link that looks like a button is a Next `Link`, or an `<a>` for an outside address, with `className={cn(buttonVariants(...))}`, like the docs link in `src/app/page.tsx`. Screen readers then announce it as a link. Don't use `Button` with `nativeButton={false}` for links.
- Put a `Label` beside a `Switch` and link them with `htmlFor` and the switch's `id`. Don't wrap the switch in the label: in happy-dom, one click then toggles it twice.
- Every `localStorage` read and write is wrapped in try/catch, so blocked storage only means the saved state is lost.

## Data and states

- Pages get data by calling a service on the server. See "How a request flows" in `.claude/rules/architecture.md`.
- A page that reads `searchParams` already renders on every request, so it doesn't call `await connection()`. A page that reads data but not `searchParams` starts with `await connection()`, so Next renders it per request and not once at build time.
- A text or date box that updates the URL waits 500 ms before it does, so typing doesn't fire a request for every key.
- Use `error.tsx` for error states. It needs `"use client"`, and in Next 16.3 it receives `retry`, not `reset`.
- Don't add a `loading.tsx` anywhere. A root one puts a skeleton into every page's first HTML instead of its content. Any one makes a page start streaming before it knows a record is missing, so Not found comes back with status 200 instead of 404.
- A component never reads the clock while it renders. React's purity lint rejects `new Date()` in a component, so the server works out anything relative to now, like "yesterday", and passes it down.
