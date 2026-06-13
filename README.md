# throwaway

A Cloudflare Worker that detects disposable/temporary email domains, invalid TLDs, and non-existent domains (no MX records), exposed as a fast JSON API. Ships 72K+ domains in a ~173KB binary bloom filter. Uses [tldts](https://github.com/nicolo-ribaudo/tldts) for TLD validation and Cloudflare DNS-over-HTTPS for MX resolution. Includes a clean web UI at `/` for quick checks, `/llms.txt` for AI agent discovery, OpenAPI/catalog metadata, no-auth documentation, and MCP-compatible tool discovery.

**Live deployment:** [throwaway.sslboard.com](https://throwaway.sslboard.com)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sslboard/throwaway)

## Honest context

**This project was written almost entirely by AI.** I needed a disposable-email checker for [SSLBoard](https://sslboard.com) (a free cybersecurity assessment tool) and I used Claude to build it. I'm sharing it as open source because the underlying approach (a binary bloom filter served from a Cloudflare Worker, with DNS checks but no paid external API dependency) is genuinely useful and I haven't seen it done this way before.

I understand the code, I can maintain it, and I'm happy to be accountable for it. But I'd rather be upfront than have someone dig through the commit history wondering why it looks the way it does.

**Why I needed this:** About 22% of SSLBoard users sign up with a disposable email. That's not people protecting their privacy from a corporation. It's people scanning infrastructure they don't own, anonymously, with no way to follow up or hold anyone accountable. Blocking disposable addresses isn't anti-privacy; it's anti-abuse in a specific context where anonymity enables harm. Your use case may differ, and the tool is neutral: it just reports whether a domain is known-disposable.

**Coverage gaps:** The domain list comes from [disposable/disposable](https://github.com/disposable/disposable), a community-maintained blocklist. It won't catch every disposable provider, especially newer ones. If you find a miss, [open an issue upstream](https://github.com/disposable/disposable/issues) or submit a PR here with a regression test.

## How It Works

At build time, `npm run build:filter` fetches the [disposable/disposable](https://github.com/disposable/disposable) list (72K+ entries) and compiles it into a **bloom filter** (a space-efficient probabilistic data structure). The filter is stored as a raw `.bin` file and loaded via Cloudflare Workers' [Data rule](https://developers.cloudflare.com/workers/wrangler/configuration/#rules) as an `ArrayBuffer` at module load time. No base64, no encoding overhead, zero decode cost.

At request time, [tldts](https://github.com/nicolo-ribaudo/tldts) parses the domain to determine whether the TLD is a real, ICANN-recognized public suffix. This catches addresses like `user@fake.notarealtld` that have no chance of receiving mail.

Additionally, each domain is checked for MX records via Cloudflare DNS-over-HTTPS. The resolver uses unfiltered Cloudflare DNS for MX records, then checks Cloudflare family DNS for domains that can receive email. This keeps `has_mx` focused on deliverability while `dns_blocked` reports whether filtered DNS blocks an otherwise email-capable domain. Domains without MX records can't receive email, so even a domain with a valid TLD but no mail server is flagged (`has_mx: false`) and filtered-DNS checks are skipped. The lookup has a 3-second timeout per resolver and returns `false` on DNS errors.

### Bloom Filter Properties

| Property            | Value                                    |
| ------------------- | ---------------------------------------- |
| Items               | ~72K domains                             |
| Filter size         | ~173 KB                                  |
| False positive rate | ~0.01% (1 in 10,000)                     |
| False negatives     | **Zero**                                 |
| Hash functions      | 10 (double-hashing from 2 cyrb53 hashes) |

**On false positives:** At ~0.01%, a false positive means roughly 1 in 10,000 legitimate users gets incorrectly flagged. Bloom filters guarantee **zero false negatives**: a known-disposable domain will never slip through. But the false positive rate is real and depends on filter tuning. Whether that matters depends on your context. In B2C products (forums, messaging apps, consumer signups), anonymity is often a legitimate need, and blocking disposable domains works against your users. Throwaway is designed for B2B scenarios where verified identity is part of the value proposition. In SSLBoard's case, users perform internet-wide security scans that can look like attacks. A real email address creates accountability and gives us a way to follow up. A disposable address lets someone scan infrastructure they don't own with no trace. That's why the tradeoff is acceptable here, but it may not be for you.

## API

### `GET /`

Minimal web UI with a single input field to check emails. Shows three verdicts: **LEGITIMATE**, **DISPOSABLE**, or **INVALID**.

### `GET /check?email=user@domain.com`

Check a single email address.

```json
{
	"email": "user@mailinator.com",
	"domain": "mailinator.com",
	"valid_tld": true,
	"has_mx": true,
	"dns_blocked": false,
	"disposable": true,
	"should_reject": true
}
```

### `GET /check?domain=mailinator.com`

Check a single domain.

```json
{
	"domain": "mailinator.com",
	"valid_tld": true,
	"has_mx": true,
	"dns_blocked": false,
	"disposable": true,
	"should_reject": true
}
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
			"has_mx": true,
			"dns_blocked": false,
			"disposable": true,
			"should_reject": true
		},
		{
			"email": "john@gmail.com",
			"domain": "gmail.com",
			"valid_tld": true,
			"has_mx": true,
			"dns_blocked": false,
			"disposable": false,
			"should_reject": false
		},
		{
			"email": "test@fake.notarealtld",
			"domain": "fake.notarealtld",
			"valid_tld": false,
			"has_mx": false,
			"disposable": false,
			"should_reject": true
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
		{
			"domain": "mailinator.com",
			"valid_tld": true,
			"has_mx": true,
			"dns_blocked": false,
			"disposable": true,
			"should_reject": true
		},
		{
			"domain": "gmail.com",
			"valid_tld": true,
			"has_mx": true,
			"dns_blocked": false,
			"disposable": false,
			"should_reject": false
		}
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

### Agent-readiness endpoints

All agent-facing endpoints are public and require no authentication:

- `GET /llms-full.txt` — expanded machine-readable documentation with all discovery links.
- `GET /auth.md` — explicit no-auth/no-commerce policy and request limits.
- `GET /openapi.json` — OpenAPI 3.1 REST contract.
- `GET /api-catalog.json` — machine-readable service catalog.
- `GET /.well-known/mcp-server.json` — MCP server discovery card.
- `GET /mcp` — lightweight JSON-RPC tool endpoint for listing and calling validation tools.
- `GET /.well-known/agent-skills.json` — usage guidance for agents.
- `GET /.well-known/agent-card.json` — minimal stateless agent card.
- `GET /robots.txt` and `GET /sitemap.xml` — crawler policy and discovery inventory.

The homepage also supports markdown negotiation with `Accept: text/markdown` or `?format=markdown`.

### Response Fields

| Field                  | Type    | Meaning                                                                                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valid_tld`            | boolean | `true` if the domain ends in a real ICANN-recognized TLD. `false` means the address can't receive mail.                                                        |
| `has_mx`               | boolean | `true` if the domain has MX records (can receive email). `false` means no mail server exists.                                                                  |
| `dns_blocked`          | boolean | `true` if Cloudflare family DNS appeared to block an otherwise email-capable domain. Omitted when `has_mx` is `false` because filtered-DNS checks are skipped. |
| `dns_blocked_category` | string  | Optional when `dns_blocked` is `true`: `malware`, `family`, or `unknown`, inferred by comparing Cloudflare family DNS with malware-only DNS.                   |
| `disposable`           | boolean | `true` if the domain is in the disposable-email blocklist. Only meaningful when `valid_tld` is `true`.                                                         |
| `should_reject`        | boolean | `true` when rules 1–4 below apply (invalid TLD, no MX, disposable, or filtered-DNS blocked); `false` only for rule 5 (accept).                                 |

### Decision Logic

`should_reject` is derived from these rules:

1. `valid_tld: false` → **reject** (domain is not real)
2. `has_mx: false` → **reject** (no mail server, can't receive email)
3. `valid_tld: true` + `has_mx: true` + `disposable: true` → **reject** (known throwaway provider)
4. `valid_tld: true` + `has_mx: true` + `dns_blocked: true` → **reject** (blocked by filtered DNS)
5. `valid_tld: true` + `has_mx: true` + `disposable: false` + `dns_blocked: false` → **accept**

### Error Responses

All errors return `{"error": "message"}` with appropriate status codes:

| Status | Meaning                            |
| ------ | ---------------------------------- |
| `400`  | Missing/invalid parameters or body |
| `404`  | Unknown path                       |
| `405`  | Unsupported HTTP method            |

## Performance

- **Bloom filter lookup**: pure arithmetic, microsecond responses
- **MX resolution**: DNS-over-HTTPS via unfiltered Cloudflare DNS for MX, plus Cloudflare family/security DNS A-record checks for otherwise email-capable domains (3s timeout per resolver)
- **Zero cold-start overhead**: filter loaded as a `Uint8Array` at module load time
- **One runtime dependency**: `tldts` for TLD validation (bundled by Wrangler)

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

## End-to-end tests (Playwright)

The `e2e/` specs drive the `/` UI in a browser and assert the verdict text (e.g. legitimate, disposable, no MX records, invalid) against a **local** Worker.

**Install browsers once** (after `npm install`):

```bash
npx playwright install chromium
```

**Run the suite**:

```bash
npm run test:e2e
```

Playwright starts `wrangler dev` on **port 8788** and targets that URL. If `src/generated/filter.bin` is missing, the dev-server command runs `npm run build:filter` first. When `CI` is set in the environment, an existing server on that port is not reused. The Worker resolves MX records over the network, so the runner needs outbound HTTPS (for example to `cloudflare-dns.com`).

**Debug in the Playwright UI**:

```bash
npx playwright test --ui
```

**CI**: install browsers in the job (for example `npx playwright install chromium` or `npx playwright install --with-deps chromium` on Linux), then run `npm run test:e2e`.

## License

MIT, by the people at [SSLBoard.com](https://sslboard.com)
