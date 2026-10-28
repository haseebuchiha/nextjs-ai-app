---
paths:
  - "src/services/**"
  - "tests/services/**"
---

# LLM call rules

These cover the LLM: the one module that talks to it, prompts, structured output, where calls run, token usage and tests. As in `.claude/rules/architecture.md`, "model" alone means a file in `models/`, and the language model is the LLM.

## The LLM module

- The packages are `ai` (AI SDK 7) and `@ai-sdk/openai`. The template has no LLM module yet. Add it as `src/services/llm.ts`, starting with `import "server-only"`.
- `src/services/llm.ts` is the only file that imports `@ai-sdk/openai`. Every LLM call goes through it. Other services call its exports, like `generateStructured`. The LLM object itself isn't exported.
- It builds the LLM once, when it loads: `createOpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY }).responses(LLM_MODEL)`, the Responses API. The three settings come from `config/env.ts`, never from `process.env`.
- Don't switch to `.chat(LLM_MODEL)`. The default `LLM_BASE_URL` is a local `openai-oauth` proxy, and its chat-completions route drops `response_format`, so the schema never reaches the LLM.
- All three settings have defaults, so the app, CI and tests start without an LLM endpoint. `LLM_API_KEY` defaults to `not-needed`, because `@ai-sdk/openai` wants a key even when the proxy ignores it.
- The LLM is built at the bottom of `services/llm.ts`, after the helpers it calls.
- `services/llm.ts` logs one info line when it loads, with the base URL and the model name. Never log the key.
- Every call sends `providerOptions.openai` with `store: false`. The proxy keeps no state, and rejects the `item_reference` items the SDK sends on multi-turn calls otherwise. Never send `promptCacheRetention` to the proxy: it rejects it as "Unsupported parameter".
- Each kind of call passes its own `promptCacheKey` in those options. The key is a constant in capitals at the top of the service that makes the call.

## Calls

- A structured call is `generateText` with `output: Output.object({ schema })`, the schema a Zod schema. `generateObject` is deprecated in AI SDK 7. Export one helper for it, like `generateStructured({ schema, instructions, prompt, promptCacheKey })`, that returns the parsed `output` and the call's usage.
- Every call has `maxRetries: 0`. A retry is a second paid call that nothing records, and the timeout already bounds the call.
- Every call has an `abortSignal: AbortSignal.timeout(...)`, from a constant in capitals, like 20 seconds for a structured call. A call with several steps gets one timeout across all of them.
- AI SDK 7 renamed things older examples use: `instructions`, not `system`. `isStepCount`, not `stepCountIs`. `onEnd`, not `onFinish`.

## Prompts

- Prompts, instructions and tool descriptions are constants in capitals at the top of the service that owns them, like `REPLY_INSTRUCTIONS`. Output and input schemas are Zod schemas, so they keep camelCase names and sit at the bottom, like `replySchema`. `services/llm.ts` holds no prompt of its own.
- A prompt is built from facts the service already has, one line per fact. Cut large JSON before it goes in, like to 2000 characters a field.
- Work out the numbers in code and give the LLM counts, never rows, so the prompt stays a few hundred tokens however much data there is. The instructions say to use only the numbers given.
- Decide in code anything code can decide, like a threshold, a category or a severity. The LLM only puts it into words, so its output schema has no field for it. That stays repeatable, testable, and works with the LLM down.
- When a prompt talks about time, the instructions end with the current time in UTC, built per call. With only the date, the LLM read "the last 24 hours" as "since midnight".

## Where calls run

- Never call the LLM inside the step that saves the main record. The LLM step runs after it, in its own try/catch, so a slow or broken LLM can't lose or fail that record. A failed LLM step is logged with the record's id.
- The row a call is about is saved first, as `pending`, before the LLM is asked. It then becomes `written`, with the text and the tokens, or `failed` when anything in the LLM step throws. An LLM outage can never hide the row.

## Tools

- A tool's `execute` checks its input against a strict Zod schema before anything else runs. A rejected input throws an error that says why, so the LLM sees it as the tool's error and can retry.
- Never give the LLM a tool that writes, runs raw SQL or takes a free-form string to run. To read the database, the LLM writes query arguments as JSON for a few read methods, and `execute` checks them before they reach a model.
- A call with tools runs with `stopWhen: isStepCount(n)`, so one answer makes at most `n` LLM requests.

## Usage and cost

- Every LLM call's tokens are stored on the row it produced, in `inputTokens`, `cachedInputTokens` and `outputTokens`. There's no separate call log table.
- One helper turns the AI SDK's usage into those three. The cached part is `inputTokenDetails.cacheReadTokens`. Any count the provider leaves out is 0.
- `cachedInputTokens` is the part of `inputTokens` the provider's prompt cache served, not an extra amount.
- Only the server sets tokens. Ignore any token counts the browser sends.
- A cost estimate comes from a price table in `services/llm.ts`: input, cached input and output prices per million tokens for each model name, plus a default. It charges `inputTokens - cachedInputTokens` at the input price and `cachedInputTokens` at the cached price. These are estimates, not a bill. Update the table when `LLM_MODEL` or its price changes.
- A cap on calls is counted from the saved rows on every check. Never keep a counter in memory: a restart would reset it.

## Tests

- Tests never call a real LLM.
- The tests of `services/llm.ts` mock `@ai-sdk/openai` with a factory, so `createOpenAI(...).responses()` returns a `MockLanguageModelV4` from `ai/test`. The factory pushes each one it builds onto a list the suite holds in `vi.hoisted`, and a test takes the mock from that list. Each test sets the reply with `vi.spyOn(mock, "doGenerate")`. Never export the LLM from `services/llm.ts` for a test.
- Tests of services that call the LLM mock `@/services/llm` itself, with its exports as `vi.fn()`.
- `services/llm.ts` stays at 100% of lines and branches.
