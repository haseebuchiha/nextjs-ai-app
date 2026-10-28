---
paths:
  - "src/jobs/**"
  - "src/instrumentation.ts"
---

# Timed job rules

These cover timers in `src/jobs/` and Next's startup file, `src/instrumentation.ts`. How the folders fit together is in `.claude/rules/architecture.md`.

## The startup file

- `instrumentation.ts` is Next's required name for its startup file. It only calls clearly named functions from `jobs/`, like `startCleanupTimer`.
- Its `onRequestError` sends every uncaught server error to the logger. The template has no `register()` yet. Add one with the first job.
- `register()` does nothing unless `process.env.NEXT_RUNTIME === "nodejs"`, because Next also calls it for the edge runtime. Next swaps that check in at build time, so it stays in `instrumentation.ts` and doesn't go through `config/env.ts`.
- Inside that check, `register()` loads each job with `await import("@/jobs/<name>")`, like `onRequestError` loads the logger, then starts its timer and calls its shutdown function.
- `next build` doesn't call `register()`, so a build never starts a timer.

## Timers

- A timer is a plain `setInterval`. There's no scheduling library. The interval is a constant in capitals, or a setting read from `config/env.ts`.
- A job calls services, never `models/` or `db/`. Lint enforces this.
- Each run catches its own errors. An unhandled error inside the interval would crash the whole app.
- A step that can fail on its own, like an LLM call, runs after the main step in its own try/catch, so it never touches what the main step saved. The LLM rules are in `.claude/rules/llm.md`.
- One run can't overlap the next. Every slow step has a timeout, and their total stays under the interval.
- There's no run at startup. The first one comes one interval after the server starts, so restarts and deploys don't add runs off the schedule.
- The interval handle lives on `globalThis`. When the start function runs again, it clears the old interval and starts a new one, so there's never a second timer. Next calls `register()` once per server, so in practice this only matters in tests.
- Each job exports a shutdown function. It listens once for `SIGTERM` and `SIGINT` and clears the timer. A restart drops a run that's still in flight.
- Each job logs every run: what it did when it works, the error when it doesn't.
- A daily job doesn't wait for midnight. It checks every few minutes whether the last day's work exists, and does it when it doesn't. So it runs soon after midnight UTC, and soon after a restart that missed it. A `pending` row left by a crash is tried again.
- In development, `next dev` doesn't re-run `register()` when you edit a file. The timer keeps running the code it started with, so restart `pnpm dev` after changing a job or anything it calls.
- Run exactly one instance of the app. A second copy would run every job twice.
