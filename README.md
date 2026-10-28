# nextjs-ai-app

A copier template for a new Next.js app with Postgres and an LLM. It holds the setup only: tooling, strict lint rules, the folder layout, the AI-assistant rules, CI and hooks. A new project passes every check straight after it's created.

## Create a project

```bash
uvx copier copy /Users/apple/Projects/templates/nextjs-ai-app <dest>
cd <dest>
pnpm install
cp .env.example .env
```

Copier asks for three things: the project name (a human title), the package name (kebab-case, taken from the name by default) and a one-line description. Then set `DATABASE_URL` and the `LLM_*` values in `.env`, and commit the new project with git, because `copier update` needs a git repo with a clean tree.

## Pull later template changes

Commit the change in this template repo first, then run this in the project:

```bash
uvx copier update
```

Copier replays your answers, merges the template changes into the project and marks conflicts inline for you to resolve.

## What's included

- Next 16 (App Router), React 19 and TypeScript
- Tailwind 4 and shadcn on Base UI, with the `button` component and `cn`
- Prisma 7 with the pg adapter, a schema with no models yet, and prisma-lint
- Zod for env vars (`src/config/env.ts` is the only file that reads them), pino for logging, and the AI SDK (`ai` and `@ai-sdk/openai`)
- Vitest with Testing Library and happy-dom, and one test
- Biome for formatting, and a strict custom ESLint config: no comments, builder style, naming, and import layers between folders
- Empty layer folders: `src/app/api`, `src/services`, `src/models`, `src/jobs`, `src/hooks`
- Claude Code: `CLAUDE.md`, `AGENTS.md`, rule files in `.claude/rules/`, and hooks that format and lint every edited file
- `decisions.md` with the setup decisions and their reasons
- GitHub Actions CI: format, migrate, lint, type-check, tests with coverage, and build
- A `pnpm-lock.yaml` pinned to known-good versions

## Checks

```bash
pnpm lint
pnpm format:check
pnpm exec next typegen && pnpm exec tsc --noEmit
pnpm test
pnpm build
```
