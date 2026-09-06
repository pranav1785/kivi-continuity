# Primary review method: hosted application

Open **https://kivi-continuity.pranavbhatnagar17.chatgpt.site**. The public Site initializes a reproducible Atlas workspace in the persistent database on first visit. No demonstration username, password, model key, environment variable, or manual access grant is required.

## Primary interactions

1. Open **Hey Kivi**.
2. Select **What did we decide about Atlas?** to retrieve supported decisions.
3. Open any source pill beneath the answer to inspect the original transcript, application, timestamp, confidence, and memory relation.
4. Select **What am I responsible for?** to retrieve commitments.
5. Select **Prepare an update for the Atlas team** to create an action that waits for confirmation.
6. Ask **What is the Atlas budget?** and verify that Kivi abstains.
7. Open **Memory** to inspect the complete memory ledger.
8. Open **Activity**, replay a new transcript, and verify that the ledger changes.
9. Select **Reset demo** to restore the seed state.
10. Open **Evaluation** to inspect the 500-record baseline, memory classification metrics, answer/abstention accuracy, runtime, and cost.
11. Open **Clarifications**, compare both sourced versions of a conflict, choose one, and verify that Kivi keeps it active while superseding the other.
12. Open **Why** to inspect persisted create, reject, and ignore decisions with the source transcript and rule reason.
13. Open **Control** to pause semantic memory, change action authority, retire a memory, and confirm or dismiss a prepared action.

## Local source validation

Required runtime: Node.js 22.13 or newer.

```bash
npm ci
npm run lint
npm run build
npm run corpus:generate
npm run evaluate
npm run evaluate:dialogsum
```

The hosted method is primary because it supplies and migrates the D1 database binding. No model key or environment variable is required for this milestone.

## Candidate evaluation procedure

From the repository root, run `npm ci`, `npm run corpus:generate`, and `npm run evaluate`. The command regenerates all 500 inputs and writes the aggregate report to `data/evaluation-results.json` plus one inspectable row per record to `data/evaluation-traces.jsonl`. The run intentionally exits successfully even when product cases fail; failures remain visible in the report.

## Inspection and reset

Normal users inspect memories and sources in the **Memory** view and provenance sheets. Engineers can inspect the complete JSON state at `/api/state`. Drizzle migrations live in `drizzle/`.

Use **Reset demo** or send a `POST` request to `/api/reset`. Reset deletes runtime rows before recreating the documented seed state.

## Bulk corpus import

Translate the corpus into one JSON object shaped as `{ "records": [...] }`, then send a `POST` request to `https://kivi-continuity.pranavbhatnagar17.chatgpt.site/api/corpus/import` with `Content-Type: application/json`. Each record must include `raw_asr`, `app`, and `project`; `formatted_output` and `occurred_at` are optional. The request accepts 1-500 records and writes through the same ingestion, persistence, memory, provenance, clarification, and decision-log pipeline as the Activity screen.

Example record:

```json
{"raw_asr":"we finally decided to launch atlas","formatted_output":"We finally decided to launch Atlas.","app":"Slack","project":"Atlas","occurred_at":"2026-09-05T10:00:00Z"}
```

The reproducible evaluator does not mutate the hosted demonstration database. Inspect all 500 decisions in `data/evaluation-traces.jsonl`; each row includes original input, expected and actual memory decisions, provenance, the Hey Kivi query behavior, and the rule reason. Inspect hosted database state at `/api/state`; the response includes transcripts, memories, source links, persisted memory decisions, clarifications, actions, and settings. Use **Reset demo** or `POST /api/reset` to restore the seed state.
