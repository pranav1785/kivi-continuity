# Kivi Continuity

Kivi Continuity is a working demonstration of a memory-backed, cross-application work copilot. It turns transcript-like activity into traceable memories about decisions, commitments, deadlines, ownership, and durable preferences. Hey Kivi can retrieve those memories, answer only when evidence exists, show the source interactions behind every claim, and prepare a low-risk action for user confirmation.

Ordinary dictation stores what the person said and preserves its formatted version. Semantic memory affects only Hey Kivi: it decides which durable facts, episodes/deadlines, commitments, decisions, and explicit preferences can support later requests.

## Current product slice

- Persistent transcript, memory, source, clarification, action, and settings tables in Cloudflare D1
- Deterministic memory extraction with explicit confidence and rejection rules
- Cross-application seed activity from Slack, Gmail, Docs, Meetings, and Calendar
- Expandable provenance for every memory-backed answer
- Abstention when no supported answer exists
- Draft-action creation under a confirm-before-action authority level
- Replayable transcript ingestion and a reproducible reset path
- A deterministic 500-record corpus with record-level evaluation traces
- A bulk corpus import endpoint and an in-product evaluation summary
- Persisted learn/ignore/reject decisions with reasons
- User-controlled consent, authority, conflict resolution, action confirmation, and memory retirement
- Automatic inactivation of expired dated memories

## Architecture

The Vinext/React interface calls server-side API routes. API routes use Drizzle ORM against D1. Ingestion stores the original transcript before extracting candidate memories. Every accepted memory receives a source record pointing back to the transcript. Hey Kivi ranks only active memories and returns the selected evidence with the answer.

```text
Transcript -> deterministic extraction -> memory decision -> D1
Question   -> active-memory retrieval -> supported answer/action -> source trace
```

## Product routes

- `GET /api/state` returns the complete inspectable workspace state.
- `POST /api/ingest` stores and processes a transcript-like record.
- `POST /api/ask` produces an evidence-backed answer or abstention.
- `POST /api/reset` restores the reproducible Atlas demonstration.
- `POST /api/corpus/import` accepts up to 500 corpus records in one request.
- `POST /api/clarifications/resolve` activates the version chosen by the user and supersedes the conflicting alternative.
- `POST /api/memories/retire` makes a memory inactive without erasing its audit trail.
- `POST /api/settings` changes semantic-memory consent or action authority.
- `POST /api/actions/decide` confirms or dismisses a prepared action.

## Corpus and evaluation

Run `npm run corpus:generate` to recreate the 500 transcript-like records, then `npm run evaluate` to test memory creation, rejection, kind classification, provenance, retrieval, and abstention. The run writes:

- `data/corpus.jsonl` — raw ASR, formatted output, app/project/time metadata, expected outcome, and test query
- `data/evaluation-traces.jsonl` — one inspectable trace per record
- `data/evaluation-results.json` — aggregate metrics
- `public/evaluation-results.json` — the summary shown in the Evaluation tab

The corpus is synthetic by design: it provides exact labels, contains no personal data, and makes this baseline fully reproducible. A separate public conversational or meeting dataset should be used as an external generalization test; its results must be reported separately rather than blended into this calibrated baseline.

The generated baseline currently passes 450 of 500 cases. Precision is 100%, recall is 83.33%, memory-kind accuracy is 83.33%, and answer/abstention accuracy is 90%. The 50 visible failures are implicit factual statements that the deliberately conservative extractor misses. The report also records extraction, retrieval, and end-to-end latency; serialized database growth; zero model calls; and zero model cost.

`npm run evaluate:dialogsum` runs a separate 100-dialogue stress test using [DialogSum](https://github.com/cylnlp/dialogsum), a public real-life dialogue dataset released under CC BY-NC-SA 4.0. Because DialogSum labels summaries rather than semantic memories, this report measures extraction-cue coverage only and never presents that number as precision or accuracy.

## Current limitations

- Extraction is intentionally narrow; model-backed structured extraction follows the baseline evaluation harness.
- Tools currently create internal action records rather than calling third-party services.
- The current evaluation is a deterministic rule-coverage baseline, not evidence of real-world generalization.
- Public DialogSum coverage is descriptive because the source dataset has no semantic-memory ground truth.
- The deterministic extractor prioritizes explainability and currently misses implicit facts without an explicit ownership pattern.
- Cross-application integrations are replayed through supplied metadata; this demonstration does not call production Slack, Gmail, or calendar APIs.
- Expired and retired memories retain their full provenance for audit rather than being compacted into a later minimal record.
- The candidate-authored Part One documents remain pending and are not generated here.

## AI use

AI was used to implement, test, and document Part Two; generate the synthetic corpus; and prepare the separate DialogSum adapter. No model API is used at runtime by the deterministic baseline. The candidate must independently write the product positioning statement and product vision document required by Part One.

## Starter development reference

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from `oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build and verify the rendered development-preview metadata
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
