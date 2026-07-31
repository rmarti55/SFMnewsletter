# SFNM article fetching

Plain HTTP access to [Santa Fe New Mexican](https://www.santafenewmexican.com) article HTML. No browser, no JavaScript, no auth.

**Summary:** A `curl` GET returns full article HTML (~450–520 KB). The paywall is a client-side subscribe overlay; the server sends the complete body. Validated from a Mac home IP on 2026-07-31. Not tested from Hetzner VPS or Vercel datacenter IPs.

## Request conventions

| Item | Value |
| --- | --- |
| Method | `GET`, no auth |
| User-Agent | `SantaFeMinutes-Research/1.0 (+webeditor@sfnewmexican.com)` |
| Base URL | `https://www.santafenewmexican.com` |

### Fetch one article

```sh
curl -s -A 'SantaFeMinutes-Research/1.0 (+webeditor@sfnewmexican.com)' \
  'https://www.santafenewmexican.com/news/local_news/regulators-approve-private-equity-buyout-of-new-mexico-gas-co/article_ea4a59e5-3fa6-4a60-bba6-8088511c5dcc.html'
```

Expect HTTP 200 and ~450–520 KB of HTML. A body marker check used in stage1 tests: response contains full article content (not a truncated stub).

## URL discovery — daily editorial sitemap

Primary source for today's article URLs.

```
GET https://www.santafenewmexican.com/tncms/sitemap/editorial.xml?date=YYYY-MM-DD
```

| Field | Notes |
| --- | --- |
| `date` | `YYYY-MM-DD` — one sitemap per calendar day |
| Response | HTTP 200, XML listing `<loc>` URLs |

On 2026-07-30 the sitemap had ~80 URLs; ~13 matched local-relevance filters below. Most of the rest is syndicated content (e.g. Shazam lists).

### Path filters (keep)

- `/news/local_news/`
- `/news/elections/`
- `/news/legislature/`

Also tested: homepage and individual article URLs directly.

### List filtered URLs for a date

```sh
DATE=2026-07-30
curl -s -A 'SantaFeMinutes-Research/1.0 (+webeditor@sfnewmexican.com)' \
  "https://www.santafenewmexican.com/tncms/sitemap/editorial.xml?date=${DATE}" \
  | grep -oE 'https://[^<]+' \
  | grep -E '/news/(local_news|elections|legislature)/'
```

## RSS (secondary — not full text)

Useful for titles and links only; does not include article body.

```
GET https://www.santafenewmexican.com/search/?f=rss&t=article&l=50&s=start_time&sd=desc
```

| Field | Notes |
| --- | --- |
| Response | HTTP 200 — title, ~70-char blurb, link per item |
| Rate limits | Hit HTTP 429 once under heavy load during testing; article pages did not |

Prefer sitemap + direct article fetch for full text.

## Response headers observed

| Header | Meaning |
| --- | --- |
| `x-vcache: HIT` | CDN cache hit |
| `cache-control: max-age=10` | Short TTL on article pages |
| `x-tncms-bot-tier: 1` | Present on some election URLs — still returned full body |

**Referer / Accept-Language:** No difference in response body when varied.

## Rate limits (tested 2026-07-31)

Article pages showed no rate limiting in stage1 testing. Raw log: `/tmp/sfnm-stage1-20260731.log`.

| Test | Result |
| --- | --- |
| 200 rapid requests, same article | 200/200 |
| Batches of unique articles at 1 req/sec | 200/200 |
| 3, 5, 10 parallel requests on 13 URLs | all 200 |
| ~420 total article fetches in one session | 0 failures |

Practical daily volume: ~15–20 articles ≈ 9 MB bandwidth (~470 KB × 20).

## Daily workflow

1. Fetch today's editorial sitemap for `YYYY-MM-DD`.
2. Filter URLs to `/news/local_news/`, `/news/elections/`, `/news/legislature/`.
3. GET each article URL with the User-Agent above.
4. Parse title, byline, date, and body from the HTML.

**Follow-up (not documented yet):** HTML selectors or parsing rules for step 4.

## Limits and fragility

- **IP:** Only tested from a Mac home IP. Hetzner VPS and Vercel datacenter IPs not tested.
- **Paywall:** Soft today — server sends full HTML. They could switch to server-side truncation anytime.
- **RSS:** Rate-limits under load; use sitemap + article pages for reliable full text.
- **Ceiling:** No article-page rate limit found (stopped at ~420 fetches); daily need is trivial by comparison.

## Provenance

| Field | Value |
| --- | --- |
| Test date | 2026-07-31 |
| Log file | `/tmp/sfnm-stage1-20260731.log` (local only — not committed) |
