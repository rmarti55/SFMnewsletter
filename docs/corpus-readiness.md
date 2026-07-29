# Corpus readiness

How to interpret the Santa Fe Minutes export API when previewing or generating a newsletter issue. Read this before assuming a thin corpus means something is broken.

## What readiness is

The export API (`GET /api/export/newsletter-corpus`) returns a time window anchored on an **issue date**:

- **Lookback** (default 7 days) — past meetings that could feed story items
- **Lookahead** (default 7 days) — upcoming meetings for the "On the docket" section

Only meetings with a **completed transcript and AI executive summary** appear in `recent[]` and feed the extract → synthesize pipeline. Everything else is classified in `readiness`.

`recentInWindow` counts **all** calendar events in the lookback window — not all of them were ever expected to have transcripts.

## Three buckets

Use `readiness.sections` in the admin UI and tooling. Do not rely on raw counts alone.

| Section | Meaning |
| --- | --- |
| `ready` | Transcript done, newsletter-grade — appears in `recent[]` |
| `neverTranscribed` | Committee outside SFM's auto-transcribe list — expected, not a bug |
| `eligibleWaiting` | Featured committee, no usable transcript yet — pipeline blocked for a specific reason |

Santa Fe Minutes only auto-transcribes about nine featured committees (Governing Body, Planning, Finance, Public Works, BPAC, HDRB, Quality of Life, Charter Review) plus Public Safety. Liquor hearings, advisory boards, and most other calendar events are on the schedule but outside that pipeline.

## Reason codes

Each meeting row includes a `reason` field:

| `reason` | Bucket | Meaning |
| --- | --- | --- |
| `ready` | `sections.ready` | Included in `recent[]` |
| `not_eligible` | `sections.neverTranscribed` | Committee not on auto-transcribe list |
| `no_video` | `sections.eligibleWaiting` | Eligible committee, no YouTube video linked in SFM |
| `pending` | `sections.eligibleWaiting` | Video linked, STT or AI pass in progress |
| `no_summary` | `sections.eligibleWaiting` | Transcript completed, executive summary missing |

## Qualitative fields — display these, do not infer

The API ships human-readable copy. **Use it as-is.** Do not regex event names or guess skip reasons in this repo.

| Field | Purpose |
| --- | --- |
| `readiness.summary` | One-paragraph headline for the whole window |
| `reasonLabel` | Short label per meeting ("Meeting hasn't happened yet", "Usually not streamed") |
| `skipDetail` | Full explanation per skipped meeting |
| `sourceUrl` | Link to the meeting on santafeminutes.space (ready meetings) |

Legacy numeric fields (`skippedNoTranscriptRow`, `skippedBreakdown`, `skippedMeetings`) remain for backward compatibility. Prefer `summary` and `sections` in UI and docs.

## Worked example: issue date 2026-07-29

**Summary from API:**

> 3 meetings are ready for this issue (Historic Districts Review Board Meeting, Regular Finance Committee Meeting - Last Monday, Quality of Life Committee). 6 were never going to be transcribed — outside SFM's auto-transcribe committees. 3 are eligible but waiting (3 waiting on a YouTube link).

**Counts:** 12 meetings in the lookback window · 3 ready · 6 never transcribed · 3 eligible waiting

### Ready (3)

| Meeting | Date |
| --- | --- |
| Historic Districts Review Board Meeting | 2026-07-28 |
| Regular Finance Committee Meeting | 2026-07-27 |
| Quality of Life Committee | 2026-07-22 |

### Never transcribed (6) — expected

| Meeting | Category |
| --- | --- |
| Children and Youth Commission | Children and Youth Commission |
| One Time Event | Liquor Hearing |
| Liquor Hearing | Liquor Hearing |
| Audit Committee | Audit Committee |
| Occupancy Tax Advisory Board | Occupancy Tax Advisory Board |
| Canceled - Archaeological Review Committee | Archaeological Review Committee |

Each has `reasonLabel: "Not auto-transcribed"` and a `skipDetail` explaining the committee is outside SFM's auto-transcribe list.

### Eligible, waiting (3)

| Meeting | `reasonLabel` |
| --- | --- |
| Regular Governing Body Meeting | Meeting hasn't happened yet |
| Historic Districts Review Board Field Trip | Usually not streamed |
| Charter Review Commission Public Input Session | Usually not streamed |

These are featured committees SFM *would* transcribe if a YouTube video were linked. Governing Body was the issue date itself (meeting at 5 PM). The field trip and public input session are companion events that typically are not streamed.

## Common misconceptions

**"skippedNoTranscriptRow: 9 means transcripts are missing."**
It means nine calendar events have no transcript row. Six of those were never going to get one. Three are eligible but waiting. Use `sections` to see which is which.

**"Low ready count means the newsletter app is broken."**
No. The app correctly consumes whatever SFM marks as newsletter-grade. A thin week is normal when most calendar events are outside the auto-transcribe list or waiting on video.

**"We can infer skip reasons from event names in the newsletter repo."**
No. Qualitative detail comes from the API (`reasonLabel`, `skipDetail`). This repo displays it; SFM computes it.

## Architecture split

| System | Role |
| --- | --- |
| [Santa Fe Minutes](https://santafeminutes.space) | Calendar, YouTube matching, transcript pipeline, export API |
| **This repo** | CLI + admin UI; calls the export API only — no Neon, no direct DB |

See also: [API contract](api-contract.md), [Pipeline](pipeline.md).

## Checking readiness locally

```sh
npm run smoke:corpus -- 2026-07-29
```

Or open the admin UI → Generate → **Preview readiness**.

Generate skips early with no draft if both `recent` and `upcoming` are empty.
