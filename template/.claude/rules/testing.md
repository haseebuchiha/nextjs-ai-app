---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "tests/**"
  - "vitest.config.*"
---

# Testing rules

These cover tests and test setup. The main rules are in `architecture.md` and `code-style.md`.

## Writing a test

- Before writing or changing any test, load Matt Pocock's `tdd` skill, `mattpocock-skills:tdd`, and follow it.
- Test behaviour through the public functions and routes, never the private helpers behind them. A refactor that keeps the behaviour must not break a test.
- Write the failing test first, then only enough code to pass it. One test at a time.
- Mock only at the edges: `fetch`, the LLM, and the browser APIs happy-dom lacks. Don't add a mock of our own code just to make a test easier to write.
- An expected value comes from a known-good literal or a worked example, never from working it out the way the code does.
- The skill agrees with the owner which public functions and routes to test before any test is written. A subagent can't ask, so whoever spawns it agrees them with the owner first and writes them into the prompt.
- Subagents may not get this file. When you spawn one that writes tests, tell it to load `mattpocock-skills:tdd` and read this file first.
- Before adding a test, answer four questions. What behaviour does it protect? What bug would make it fail? Why doesn't an existing test already catch that bug? Does it need an export or hook that no production code uses? If it needs one, test at the real boundary instead. These come from a test-audit checklist.
- Counts and limits are checked exactly. To prove a limit of 50, seed 51 rows and expect 50. A check like `<= 50` passes on an empty database.

## Proving a test

- Every new or changed test must be seen failing for the right reason. For new behaviour, the test is written first and fails until the code exists. For code that already exists, break the code on purpose, for example by dropping a filter or changing a limit, and watch the test fail. Then put the code back.
- Before deleting or merging a test, prove that a test that stays catches the same bug. Break the code the way the old test would notice, and watch the remaining test fail.
- Put broken code back straight away, and check it matches the original byte for byte by comparing a sha256 before and after. A dev server may be hot-reloading the checkout, and another session may be running the tests.
- Don't break code that a timed job in `src/jobs/` runs while the dev server is up, because the job runs the broken code for real. Tamper with the test's fake input instead.
- Report each proof: what was broken, which test failed, and that the file was restored.

## Setup

- Tests run with Vitest. Component tests run in happy-dom, not jsdom, because jsdom needs Node 24.15 or newer.
- Vitest runs two projects. `server` runs `tests/**/*.test.ts` in Node. `components` runs `tests/**/*.test.tsx` in happy-dom, with `tests/setup/components.ts`, which runs Testing Library's `cleanup` after each test.
- Every server file imports `server-only`, and that import throws inside Vitest. The Vitest config swaps it for an empty module, so tests can import services and models.
- The Vitest config sets `LOG_LEVEL=silent` to keep pino quiet. It also pins `LLM_MODEL` to `gpt-5.5`, so a model set in `.env` doesn't change what tests see.
- The components project pins `TZ` to `Asia/Karachi`, a zone that isn't UTC, so a date bug that only shows away from UTC still fails on CI's UTC runner. Expected times in component tests are written for that zone.
- The Vitest config also turns on `mockReset`, `restoreMocks` and `unstubGlobals`. Every mock, spy and `vi.stubGlobal` is reset before each test, so tests don't reset them by hand.
- Test files get looser lint limits: no line or statement limit per function, callbacks can nest 4 deep, the no-`else` and inline-callback syntax rules don't apply, and the banned vague-names list doesn't apply. Every other rule still does, including arrow functions and no comments.
- Test files may load the database client directly, for example to wipe data between runs. Every other import rule still applies to them.
- Coverage uses v8 over `src/**/*.{ts,tsx}`, leaving out the generated Prisma client. `pnpm test:coverage` writes a text and an lcov report. CI runs it and uploads the report.

## Folders

- `tests/` mirrors `src/`: the test for `src/app/page.tsx` is `tests/app/page.test.tsx`, and a test for `src/services/orders.ts` goes in `tests/services/orders.test.ts`. API route tests go in `tests/api/`.
- `tests/integration/` holds tests that cross layers, like a job's tick that ends in a saved row.
- `tests/support/` holds helpers that more than one test file uses. A helper used by one file stays in that file.
- `tests/setup/` holds Vitest setup files.

## Screens

- There's no jest-dom. Check the DOM with plain `expect`, on values like `.textContent` and `.getAttribute("href")`, as `tests/app/page.test.tsx` does.
- A test that renders a component using `next/navigation`'s `useRouter` must mock it.
- When happy-dom lacks a browser API a component needs, stub it with `vi.stubGlobal` in the tests that need it.
- Debounced updates need fake timers.

## API routes

- Route tests import the handler from its `route.ts` and call it with a `Request`, like `await GET(new Request("http://localhost/api/orders?page=2"))`.

## The database

- Server tests use the real Postgres in `DATABASE_URL`. Only the edges, like `fetch`, are stubbed. CI starts Postgres 17 and runs `prisma migrate deploy` before the tests.
- Delete every row a test writes, and nothing else. Tests that seed rows put a run id in a field of their own and delete by that. Never wipe the whole table.
- Delete a row's children before the row. The foreign keys block deleting a row that still has children.
- Tests that seed rows for a time-window read, like "the last 24 hours", put them on a random day inside a far-past or far-future window of their own. Real rows in the dev database, and suites running at the same time, then never land in each other's windows. Fake `Date` to the seeded day when the code reads the current time.
- Keep a list of each suite's window under this rule. A new suite that seeds by time picks a window none of them use.
- A query a test runs needs both ends of its range inside its own window. A range with only a start, like `gte` a day in 2120, also reaches every later window.

## The LLM

- No test calls a real LLM.
- Tests of `services/llm.ts` mock `@ai-sdk/openai`, so the provider returns a `MockLanguageModelV4` from `ai/test`. Each test sets the reply with `vi.spyOn(mock, "doGenerate")`, or `doStream` for a streamed reply. The details are in `.claude/rules/llm.md`.
- Tests of services that call the LLM mock `@/services/llm` itself, with its exports as `vi.fn()`.
