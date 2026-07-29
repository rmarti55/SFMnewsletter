# OpenRouter integration

The newsletter uses OpenRouter for LLM extract and synthesize steps. All calls go through [`src/lib/openrouter.ts`](../src/lib/openrouter.ts).

## Approach

We use the **direct OpenRouter API** (`POST /api/v1/chat/completions` via `fetch`), not `@openrouter/sdk` or the Agent SDK. The pipeline only needs fixed one-shot chat completions that return JSON — no tools, streaming, or multi-turn loops.

## Pipeline usage

See [Pipeline](pipeline.md) for the full flow. OpenRouter is used in two steps:

| Step | Feature tag | Tokens | Caller |
| --- | --- | --- | --- |
| Extract storylines | `newsletter:storylines` | 4096 (retry 8192) | [`src/lib/extract-storylines.ts`](../src/lib/extract-storylines.ts) |
| Synthesize issue | `newsletter` | 1600 | [`src/lib/synthesize.ts`](../src/lib/synthesize.ts) |

Default model: `google/gemini-2.5-flash` (override with `LLM_SMART_MODEL`).

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | yes | — | Bearer token for all LLM calls |
| `LLM_SMART_MODEL` | no | `google/gemini-2.5-flash` | Model slug for extract + synthesize |
| `NEXT_PUBLIC_APP_URL` | no | `http://localhost:3000` | Sent as `HTTP-Referer` for app attribution |

## App attribution

Every request sends:

- `HTTP-Referer` — from `NEXT_PUBLIC_APP_URL` (required for OpenRouter rankings/analytics)
- `X-OpenRouter-Title: Santa Fe Newsletter`

For localhost dev, both headers are required for tracking. See [OpenRouter app attribution](https://openrouter.ai/docs/app-attribution).

## Local smoke check

Verify the key, model, and headers without running a full generate:

```sh
npm run smoke:openrouter
```

## External docs

Full OpenRouter documentation index: [openrouter.ai/docs/llms.txt](https://openrouter.ai/docs/llms.txt)
