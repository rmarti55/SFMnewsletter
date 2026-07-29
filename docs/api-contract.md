# API contract

See Santa Fe Minutes [`docs/newsletter-export-api.md`](https://github.com/...) or production:

```
GET https://santafeminutes.space/api/export/newsletter-corpus
Authorization: Bearer $NEWSLETTER_EXPORT_API_KEY
```

Query: `issueDate`, `lookbackDays`, `lookaheadDays`.

Client: [`src/lib/sfm-client.ts`](../src/lib/sfm-client.ts).
