# API contract

Read-only corpus export from [Santa Fe Minutes](https://santafeminutes.space). This repo calls it via [`src/lib/sfm-client.ts`](../src/lib/sfm-client.ts).

For semantics (why meetings are skipped, what the counts mean), see [Corpus readiness](corpus-readiness.md).

## Endpoint

```
GET https://santafeminutes.space/api/export/newsletter-corpus
Authorization: Bearer $NEWSLETTER_EXPORT_API_KEY
```

### Query parameters

| Param | Default | Notes |
| --- | --- | --- |
| `issueDate` | today (America/Denver) | `YYYY-MM-DD` — anchor for lookback/lookahead |
| `lookbackDays` | 7 | Past meetings ending on issue date |
| `lookaheadDays` | 7 | Upcoming docket starting on issue date |

### Example

```sh
curl -s -H "Authorization: Bearer $NEWSLETTER_EXPORT_API_KEY" \
  "https://santafeminutes.space/api/export/newsletter-corpus?issueDate=2026-07-29" \
  | jq '.readiness.summary, .readiness.sections | keys'
```

Local smoke (no jq):

```sh
npm run smoke:corpus -- 2026-07-29
```

## Response shape

Top-level fields:

| Field | Description |
| --- | --- |
| `issueDate` | Echo of the anchor date |
| `lookbackDays` / `lookaheadDays` | Window sizes used |
| `recent` | Meetings with newsletter-grade transcripts in the lookback window |
| `upcoming` | Docket items in the lookahead window (filtered, capped) |
| `readiness` | Counts, summary, and per-meeting skip detail — see below |

### `recent[]` (per meeting)

Meetings that feed the extract step. Inclusion rule: completed transcript + parsed executive summary.

- `eventId`, `eventName`, `categoryName`, `meetingDate`
- `transcriptId`, `transcriptStatus` (always `completed` for included rows)
- `executiveSummary`, `summary`, `cleanedTranscript`, `speakers`, `topics`
- `sourceUrl` — e.g. `https://santafeminutes.space/meeting/{id}`

### `upcoming[]` (per docket line)

- `eventId`, `eventName`, `meetingDate`
- `digest`, `agendaHighlights`

### `readiness` block

#### Primary fields (use in UI)

| Field | Type | Description |
| --- | --- | --- |
| `summary` | string | One-paragraph headline for the lookback window |
| `sections.ready` | array | Meetings in `recent[]` with `reasonLabel`, `sourceUrl` |
| `sections.neverTranscribed` | array | Calendar events outside auto-transcribe committees |
| `sections.eligibleWaiting` | array | Featured committees without a usable transcript yet |

Each row in `sections.*`:

| Field | Description |
| --- | --- |
| `eventId`, `eventName`, `categoryName`, `meetingDate` | Meeting identity |
| `reason` | `ready` \| `not_eligible` \| `no_video` \| `pending` \| `no_summary` |
| `reasonLabel` | Short human label |
| `skipDetail` | Full explanation (empty for ready rows) |
| `sourceUrl` | Meeting link (ready rows) |

#### Legacy / count fields

| Field | Description |
| --- | --- |
| `recentInWindow` | All calendar events in the lookback window |
| `recentWithCompletedTranscript` | Events with transcript status `completed` |
| `recentWithExecutiveSummary` | Events that appear in `recent[]` |
| `skippedNoSummary` | Completed transcript but no executive summary |
| `skippedNoTranscriptRow` | Events with no transcript row (mix of never-transcribed + waiting) |
| `skippedBreakdown` | `{ notEligibleCommittee, eligibleNoVideo, eligiblePending, noSummary }` |
| `skippedMeetings` | Flat list of skipped rows (same shape as section rows + `transcriptStatus`) |

Prefer `summary` and `sections` over raw counts. See [Corpus readiness](corpus-readiness.md).

### Example (truncated)

```json
{
  "issueDate": "2026-07-29",
  "lookbackDays": 7,
  "lookaheadDays": 7,
  "recent": [ "..." ],
  "upcoming": [ "..." ],
  "readiness": {
    "summary": "3 meetings are ready for this issue (...). 6 were never going to be transcribed (...). 3 are eligible but waiting (...).",
    "sections": {
      "ready": [
        {
          "eventId": 1177,
          "eventName": "Historic Districts Review Board Meeting",
          "meetingDate": "2026-07-28",
          "reason": "ready",
          "reasonLabel": "Ready",
          "skipDetail": "",
          "sourceUrl": "https://santafeminutes.space/meeting/1177"
        }
      ],
      "neverTranscribed": [
        {
          "eventId": 1080,
          "eventName": "Children and Youth Commission",
          "meetingDate": "2026-07-23",
          "reason": "not_eligible",
          "reasonLabel": "Not auto-transcribed",
          "skipDetail": "Santa Fe Minutes only auto-transcribes about nine featured committees plus Public Safety. ..."
        }
      ],
      "eligibleWaiting": [
        {
          "eventId": 933,
          "eventName": "Regular Governing Body Meeting - Last Wednesday",
          "meetingDate": "2026-07-29",
          "reason": "no_video",
          "reasonLabel": "Meeting hasn't happened yet",
          "skipDetail": "... The meeting is today or still upcoming ..."
        }
      ]
    },
    "recentInWindow": 12,
    "recentWithExecutiveSummary": 3,
    "skippedNoTranscriptRow": 9,
    "skippedBreakdown": {
      "notEligibleCommittee": 6,
      "eligibleNoVideo": 3,
      "eligiblePending": 0,
      "noSummary": 0
    }
  }
}
```

## Client

[`src/lib/sfm-client.ts`](../src/lib/sfm-client.ts) — `fetchNewsletterCorpus({ issueDate, lookbackDays, lookaheadDays })`.

Types: [`src/lib/types.ts`](../src/lib/types.ts) (`NewsletterCorpus`, `NewsletterReadiness`).
