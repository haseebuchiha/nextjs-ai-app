# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project rules

The project's own rules live in `.claude/rules/`. Read the ones for the area you're working in before you create or edit files there. Claude Code loads a rule file by itself only when it reads a matching file, not when it creates a new one, and subagents may not get them at all, so tell every subagent to read this file and the rule files it needs.

- [`architecture.md`](.claude/rules/architecture.md): what the app does, the tools, the folders, how a request flows, how to write a service, server and browser code, API routes and logging
- [`code-style.md`](.claude/rules/code-style.md): naming, function size and shape, constants and file order, formatting, linting and the checks
- [`database.md`](.claude/rules/database.md): the Prisma schema, migrations, models and the database client
- [`api-routes.md`](.claude/rules/api-routes.md): the API routes: thin handlers, checking input, error replies and caching
- [`screens.md`](.claude/rules/screens.md): pages, components and hooks: shadcn on Base UI, Tailwind and lucide icons
- [`jobs.md`](.claude/rules/jobs.md): timed jobs, started from `register` in `instrumentation.ts`
- [`llm.md`](.claude/rules/llm.md): LLM calls: the one `services/llm.ts`, prompts, structured output, tools, usage and tests
- [`testing.md`](.claude/rules/testing.md): writing and proving tests, the Vitest setup, and the database and the LLM in tests
