# throwaway

A Cloudflare Worker that detects disposable/temporary email domains and invalid TLDs, exposed as a fast JSON API. Ships 72K+ domains in a ~173KB binary bloom filter — one runtime dependency ([tldts](https://github.com/nicolo-ribaudo/tldts)), no external calls, pure edge compute. Includes a clean web UI at `/` for quick checks and `/llms.txt` for AI agent discovery.

**Live deployment:** [throwaway.sslboard.com](https://throwaway.sslboard.com)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sslboard/throwaway)

## Honest context

**This project was written almost entirely by AI.** I needed a disposable-email checker for [SSLBoard](https://sslboard.com) — a free cybersecurity assessment tool — and I used Claude to build it. I'm sharing it as open source because the underlying approach (a binary bloom filter served from a Cloudflare Worker, no external calls) is genuinely useful and I haven't seen it done this way before.

I understand the code, I can maintain it, and I'm happy to be accountable for it. But I'd rather be upfront than have someone dig through the commit history wondering why it looks the way it does.

**Why I needed this:** About 22% of SSLBoard users sign up with a disposable email. That's not people protecting their privacy from a corporation — it's people scanning infrastructure they don't own, anonymously, with no way to follow up or hold anyone accountable. Blocking disposable addresses isn't anti-privacy; it's anti-abuse in a specific context where anonymity enables harm. Your use case may differ, and the tool is neutral — it just reports whether a domain is known-disposable.

**Coverage gaps:** The domain list comes from [disposable/disposable](https://github.com/disposable/disposable), a community-maintained blocklist. It won't catch every disposable provider, especially newer ones. If you find a miss, [open an issue upstream](https://github.com/disposable/disposable/issues) or submit a PR here with a regression test.

## How It Works

At build time, `npm run build:filter` fetches the [disposable/disposable](https://github.com/disposable/disposable) list (72K+ entries) and compiles it into a **bloom filter** — a space-efficient probabilistic data structure. The filter is stored as a raw `.bin` file and loaded via Cloudflare Workers' [Data rule](https://developers.cloudflare.com/workers/wrangler/configuration/#rules) as an `ArrayBuffer` at module load time. No base64, no encoding overhead, zero decode cost.

At request time, [tldts](https://github.com/nicolo-ribaudo/tldts) parses the domain to determine whether the TLD is a real, ICANN-recognized public suffix. This catches addresses like `user@fake.notarealtld` that have no chance of receiving mail.

### Bloom Filter Properties

| Property            | Value                                    |
| ------------------- | ---------------------------------------- |
| Items               | ~72K domains                             |
| Filter size         | ~173 KB                                  |
| False positive rate | ~0.01% (1 in 10,000)                    |
| False negatives     | **Zero**                                 |
| Hash functions      | 10 (double-hashing from 2 cyrb53 hashes) |

**On false positives:** At ~0.01%, a false positive means roughly 1 in 10,000 legitimate users gets incorrectly flagged. That's worth knowing and worth weighing against your own tolerance. In SSLBoard's case it's acceptable; in a consumer signup flow it might not be. Bloom filters guarantee **zero false negatives** — a known-disposable domain will never slip through — but the false positive rate is real and depends on filter tuning.

## API

### `GET /`

Minimal web UI — single input field to check emails. Shows three verdicts: **LEGITIMATE**, **DISPOSABLE**, or **INVALID**.

### `GET /check?email=user@domain.com`

Check a single email address.

```json
{
	"email": "user@mailinator.com",
	"domain": "mailinator.com",
	"valid_tld": true,
	"disposable": true
}
```

### `GET /check?domain=mailinator.com`

Check a single domain.

```json
{ "domain": "mailinator.com", "valid_tld": true, "disposable": true }
```

### `POST /check`

Batch check emails or domains.

**Emails:**

```json
{
	"emails": ["user@mailinator.com", "john@gmail.com", "test@fake.notarealtld"]
}
```

Response:

```json
{
	"results": [
		{
			"email": "user@mailinator.com",
			"domain": "mailinator.com",
			"valid_tld": true,
			"disposable": true
		},
		{ "email": "john@gmail.com", "domain": "gmail.com", "valid_tld": true, "disposable": false },
		{
			"email": "test@fake.notarealtld",
			"domain": "fake.notarealtld",
			"valid_tld": false,
			"disposable": false
		}
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
		{ "domain": "mailinator.com", "valid_tld": true, "disposable": true },
		{ "domain": "gmail.com", "valid_tld": true, "disposable": false }
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

### `GET /llms.txt`

Machine-readable API documentation for AI agents. Plain text markdown.

### Response Fields

| Field        | Type    | Meaning                                                                                                 |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------- |
| `valid_tld`  | boolean | `true` if the domain ends in a real ICANN-recognized TLD. `false` means the address can't receive mail. |
| `disposable` | boolean | `true` if the domain is in the disposable-email blocklist. Only meaningful when `valid_tld` is `true`.  |

### Decision Logic

1. `valid_tld: false` → **reject** — domain is not real
2. `valid_tld: true` + `disposable: true` → **reject** — known throwaway provider
3. `valid_tld: true` + `disposable: false` → **accept** — looks legitimate

### Error Responses

All errors return `{"error": "message"}` with appropriate status codes:

| Status | Meaning                            |
| ------ | ---------------------------------- |
| `400`  | Missing/invalid parameters or body |
| `404`  | Unknown path                       |
| `405`  | Unsupported HTTP method            |

## Performance

- **Synchronous** — no I/O, no external API calls, no KV lookups
- **Microsecond responses** — bloom filter lookup is pure arithmetic
- **Zero cold-start overhead** — filter loaded as a `Uint8Array` at module load time
- **One runtime dependency** — `tldts` for TLD validation (bundled by Wrangler)

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

This re-fetches the domain list from [disposable/disposable](https://github.com/disposable/disposable) and writes fresh `src/generated/filter.bin` and `src/generated/filter-meta.ts` files.

## License

MIT — by the people at [SSLBoard.com](https://sslboard.com)
