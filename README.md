# throwaway-worker

A Cloudflare Worker that detects disposable/temporary email domains via a pre-built bloom filter, exposed as a fast JSON API. Ships 122K+ domains in a ~291KB binary bloom filter — zero runtime dependencies, zero external calls, pure edge compute. Includes a clean, minimal web UI at `/` for quick one-at-a-time checks.

## How It Works

At build time, `npm run build:filter` reads the [disposable-email-domains](https://www.npmjs.com/package/disposable-email-domains) domain list (122K+ entries) and compiles it into a **bloom filter** — a space-efficient probabilistic data structure. The filter is stored as a raw `.bin` file and loaded via Cloudflare Workers' [Data rule](https://developers.cloudflare.com/workers/wrangler/configuration/#rules) as an `ArrayBuffer` at module load time. No base64, no encoding overhead, zero decode cost.

### Bloom Filter Properties

| Property | Value |
|---|---|
| Items | ~122K domains |
| Filter size | ~291 KB |
| False positive rate | ~0.1% (1 in 1,000) |
| False negatives | **Zero** |
| Hash functions | 10 (double-hashing from 2 cyrb53 hashes) |

**Why 0.1% false positives are acceptable:** Disposable email signups are low-quality. A false positive means one legitimate user retries with a different address — a minor inconvenience. False negatives (letting disposables through) are the real problem, and bloom filters guarantee **zero false negatives**.

## API

### `GET /`

Serves a minimal web UI — single input field to check emails.

### `GET /check?email=user@domain.com`

Check a single email address.

```json
{ "email": "user@mailinator.com", "domain": "mailinator.com", "disposable": true }
```

### `GET /check?domain=mailinator.com`

Check a single domain.

```json
{ "domain": "mailinator.com", "disposable": true }
```

### `POST /check`

Batch check emails or domains.

**Emails:**

```json
{
  "emails": ["user@mailinator.com", "john@gmail.com"]
}
```

Response:

```json
{
  "results": [
    { "email": "user@mailinator.com", "domain": "mailinator.com", "disposable": true },
    { "email": "john@gmail.com", "domain": "gmail.com", "disposable": false }
  ]
}
```

**Domains:**

```json
{
  "domains": ["mailinator.com", "gmail.com"]
}
```

Response:

```json
{
  "results": [
    { "domain": "mailinator.com", "disposable": true },
    { "domain": "gmail.com", "disposable": false }
  ]
}
```

### `GET /stats`

Returns filter metadata.

```json
{
  "itemCount": 121570,
  "bitCount": 2330512,
  "hashCount": 14,
  "byteSize": 291314,
  "falsePositiveRate": 0.0001
}
```

### Error Responses

All errors return `{"error": "message"}` with appropriate status codes:

| Status | Meaning |
|---|---|
| `400` | Missing/invalid parameters or body |
| `404` | Unknown path |
| `405` | Unsupported HTTP method |

## Performance

- **Synchronous** — no I/O, no external API calls, no KV lookups
- **Microsecond responses** — bloom filter lookup is pure arithmetic
- **Zero cold-start overhead** — filter loaded as a `Uint8Array` at module load time, no lazy init
- **No runtime dependencies** — pure compute

## Deploy Your Own

```bash
git clone <this-repo>
cd throwaway-worker
npm install
npm run build:filter    # Generate bloom filter from disposable domain list
npm run dev             # Local development
npm run deploy          # Deploy to Cloudflare
```

### Requirements

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency)

### Regenerate the Filter

If you want to update the domain list:

```bash
npm run build:filter
```

This re-reads the `disposable-email-detector` package and writes fresh `src/generated/filter.bin` and `src/generated/filter-meta.ts` files.

## License

MIT
