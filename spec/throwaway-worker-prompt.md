# Build `throwaway-worker` — a Cloudflare Worker that detects disposable email domains via a pre-built bloom filter, exposed as a JSON API.

### Concept

A Cloudflare Worker that ships a pre-compiled bloom filter baked at deploy time from the `disposable-email-detector` domain list (185K+ domains). The filter is stored as a raw `.bin` file loaded via Workers' Data rule — no base64, no encoding overhead, zero decode cost. The worker exposes a JSON API to check one or many email addresses/domains synchronously in microseconds.

The bloom filter is built once during `npm run build` by a codegen script. The raw binary filter data (`src/generated/filter.bin`) is committed to git. The Workers Data rule loads it as an `ArrayBuffer` at module load time — a `Uint8Array` view is created once, no copies, no lazy init.

### Bloom filter parameters

- Target ~0.1% false positive rate (1 in 1000). This is acceptable because: disposable domains are low-quality signups, a false positive just means one legitimate user retries with a different address, and false negatives (letting disposables through) are the real enemy — bloom filters have zero false negatives.
- Number of hash functions (`k`): derive from `Math.ceil((m / n) * Math.LN2)` where `n` is item count and `m` is bit count.
- Use two independent `cyrb53` (or similar fast non-crypto) hashes, then derive `k` hashes via `h1 + i * h2` (standard double-hashing technique). No external dependencies.
- The filter is stored as a raw binary `.bin` file loaded as an `ArrayBuffer` via Cloudflare Workers Data rules — no base64, no encoding overhead. A `Uint8Array` view is created at module load time (zero-copy). Document the resulting byte size.

### Package structure

```
throwaway-worker/
├── src/
│   ├── index.ts          # Worker entrypoint — fetch handler, routing, JSON API
│   ├── bloom.ts          # BloomFilter class (build + query)
│   ├── hash.ts           # cyrb53 or equivalent, double-hashing
│   └── generated/
│       ├── filter.bin        # AUTO-GENERATED — raw bloom filter bytes (~330KB)
│       └── filter-meta.ts    # AUTO-GENERATED — exports BIT_COUNT, HASH_COUNT, ITEM_COUNT
├── scripts/
│   └── build-filter.ts   # codegen: reads disposable-email-detector/index.json,
│                          # builds BloomFilter, writes filter.bin + filter-meta.ts
├── wrangler.jsonc         # Workers config — includes Data rule for .bin import
├── package.json
├── tsconfig.json
├── LICENSE (MIT)
└── README.md
```

### API

**`GET /check?email=user@domain.com`**

Single email check. Returns:

```json
{ "email": "user@mailinator.com", "domain": "mailinator.com", "disposable": true }
```

**`POST /check`**

Batch check. Body:

```json
{ "emails": ["user@mailinator.com", "john@gmail.com", "test@guerrillamail.com"] }
```

Returns:

```json
{
  "results": [
    { "email": "user@mailinator.com", "domain": "mailinator.com", "disposable": true },
    { "email": "john@gmail.com", "domain": "gmail.com", "disposable": false },
    { "email": "test@guerrillamail.com", "domain": "guerrillamail.com", "disposable": true }
  ]
}
```

**`GET /check?domain=mailinator.com`**

Single domain check. Returns:

```json
{ "domain": "mailinator.com", "disposable": true }
```

**`POST /check` with domains**

Batch domain check. Body:

```json
{ "domains": ["mailinator.com", "gmail.com", "guerrillamail.com"] }
```

Returns:

```json
{
  "results": [
    { "domain": "mailinator.com", "disposable": true },
    { "domain": "gmail.com", "disposable": false },
    { "domain": "guerrillamail.com", "disposable": true }
  ]
}
```

**`GET /stats`**

Filter metadata. Returns:

```json
{ "itemCount": 184903, "bitCount": 2640000, "hashCount": 10, "byteSize": 330000, "falsePositiveRate": 0.001 }
```

**Error handling:**

- `400` — missing `email`/`domain` param on GET, missing `emails`/`domains` body on POST, or invalid JSON body.
- `405` — any non-GET/POST method to `/check` or `/stats`.
- `404` — any unmatched path.
- All error responses follow `{ "error": "message" }`.

### Worker implementation

- Use the ES module format (`export default { fetch }`).
- The bloom filter `Uint8Array` is created once at module scope from the imported `ArrayBuffer` — no lazy init, no cache dance.
- Email extraction: everything after the last `@`, lowercased.
- All responses are `application/json` with appropriate status codes.
- The worker has no external dependencies at runtime — no KV, no D1, no external API calls. Pure compute.

### Build pipeline

1. **`npm run build:filter`** — runs `scripts/build-filter.ts` via `tsx`. Reads the domain list from `disposable-email-detector` (a dev dependency), builds the bloom filter, writes `src/generated/filter.bin` (raw bytes) and `src/generated/filter-meta.ts` (typed metadata exports). Prints a summary: item count, bit count, hash count, byte size, estimated false positive rate.
2. **`npm run dev`** — runs `wrangler dev` for local development.
3. **`npm run deploy`** — runs `wrangler deploy` to deploy to Cloudflare.
4. **`npm run build`** — runs `build:filter` then `tsc --noEmit` for type checking (Workers are deployed from source via wrangler, not from a `dist/` directory).

### `wrangler.jsonc`

```jsonc
{
  "name": "throwaway-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "rules": [
    { "type": "Data", "globs": ["**/*.bin"] }
  ]
}
```

The Data rule is what makes `import filterData from './generated/filter.bin'` return an `ArrayBuffer` at runtime — no base64, no encoding, no decode step.

### `package.json` requirements

- `"name": "throwaway-worker"`
- Zero runtime dependencies. `disposable-email-detector` and `wrangler` are **devDependencies** used only by the codegen script and deployment.
- `"type": "module"`.
- `"scripts"`: `"build:filter"`, `"build"`, `"dev"`, `"deploy"`, `"test"`.

### TypeScript

- `"moduleResolution": "bundler"` in `tsconfig.json`, target ES2022.
- Strict mode enabled.
- The generated `filter-meta.ts` must have clean types — export `bitCount: number`, `hashCount: number`, `itemCount: number` — no `any`.
- Add a declaration for the `.bin` module so TypeScript knows the import type:
  ```ts
  // src/generated/filter.bin.d.ts
  declare const filterData: ArrayBuffer;
  export default filterData;
  ```

### Testing

Use `vitest` with `@cloudflare/vitest-pool-workers`. Test cases should cover:

**Unit tests:**
- Known disposable domains return `true` (test a sample of ~10 from the list).
- Known legitimate domains return `false` (`gmail.com`, `yahoo.com`, `icloud.com`, `proton.me`, etc.).
- Domain extraction handles edge cases: uppercase, leading/trailing whitespace, multiple `@` signs, empty string, missing domain.
- The bloom filter `.bin` file loads and produces a valid `ArrayBuffer` of the expected byte length.

**Integration tests (fetch handler):**
- `GET /check?email=user@mailinator.com` → `{ disposable: true }`.
- `GET /check?domain=gmail.com` → `{ disposable: false }`.
- `POST /check` with `{ "emails": [...] }` → batch results.
- `POST /check` with `{ "domains": [...] }` → batch results.
- `GET /stats` → correct metadata shape.
- `400` for missing params, empty body, invalid JSON.
- `404` for unknown paths.
- `405` for unsupported methods.

### README

Include:
- One-line description.
- Deploy your own instructions.
- API documentation (all endpoints with request/response examples).
- How it works (bloom filter, build-time codegen, zero false negatives).
- Performance notes (sync, microseconds, no I/O, no external dependencies).
- False positive rate explanation and why 0.1% is appropriate for this use case.
- Filter size (~330KB).
- How to regenerate the filter (`npm run build:filter`).
- License (MIT).

### Constraints

- Target runtime: **Cloudflare Workers**.
- No runtime dependencies.
- No `fs`, no `path`, no `__dirname`.
- No KV, no D1, no R2, no external API calls — pure compute.
- The generated `filter-meta.ts` must be a pure `.ts` file with no imports (just exported constants).
- The generated `filter.bin` is a raw binary file — no encoding, no wrapping.
- All responses are `application/json`.
- ESM module format for the worker.
