---
name: weekly-temp-email-domain-checker
description: Runs the recurring maintenance workflow for the throwaway disposable email detector. Use whenever the user asks to do the weekly temp email/domain check, find new disposable email domains, refresh the disposables bloom filter, test temp-mail services against throwaway-worker, or update scripts/supplemental-domains.txt. This skill uses browser-harness to harvest live temp email addresses from search results, tests them against a local dev Worker rather than production, appends missed domains, rebuilds the filter, and reports findings.
compatibility: Requires the throwaway-worker repo, npm, local network access, wrangler dev, and browser-harness with Chrome connected for browser harvesting.
---

# Weekly Temp Email Domain Checker

Use this workflow to keep `throwaway-worker` current with domains used by disposable/temp email services.

The goal is to add only **verified, live disposable email domains** that the freshly rebuilt local detector does not already mark as disposable.

## Repository assumptions

Run from the `throwaway-worker` repository root. If the current directory is wrong, locate the repo by finding `package.json` with `"name": "throwaway-worker"`.

Important files:

- `scripts/supplemental-domains.txt` — append missed domains here, one lowercase domain per line.
- `scripts/build-filter.ts` — fetches upstream `disposable/disposable`, merges supplemental domains, and writes `src/generated/filter.bin` + `src/generated/filter-meta.ts`.
- `src/llms.txt` — documents the `/check`, `/stats`, and batch API shape. Use `/check?domain=...` or `POST /check` to query domain coverage directly.
- `.pi/skills/weekly-temp-email-domain-checker/scripts/collect-serp-services.py` — browser-harness SERP collector that saves the deduplicated service queue and audit trail.
- `.pi/skills/weekly-temp-email-domain-checker/services.md` — Markdown inventory of SERP-discovered services, adapter status, and exclusions.
- `.pi/skills/weekly-temp-email-domain-checker/service-adapters/` — deterministic per-service browser-harness adapters. Each adapter creates/observes one live temp email and/or parses exposed domain choices for one service.
- `.pi/skills/weekly-temp-email-domain-checker/service-exclusions.json` — hosts proven not to be disposable email generators, with reasons, so SERP collection does not re-queue them.
- `.pi/skills/weekly-temp-email-domain-checker/templates/service-adapter-template.py` — scaffold for new service adapters.
- `.pi/skills/weekly-temp-email-domain-checker/scripts/run-service-adapters.mjs` — runs deterministic adapters against the saved SERP queue exactly once per host and writes combined/per-service JSON evidence.
- `.pi/skills/weekly-temp-email-domain-checker/scripts/harvest-service-emails.py` — diagnostic-only generic harvester. Do not use this as the operational fallback for missing adapters.
- `.pi/skills/weekly-temp-email-domain-checker/scripts/add-service-exclusion.mjs` — helper for adding proven non-generator hosts to `service-exclusions.json`.
- `reports/` — write a dated Markdown report after each run.

## Ground rules

- Do not add domains from memory, autocomplete, old reports, or search snippets alone. A domain must come from a live temp-email service during this run.
- Do not bypass CAPTCHAs, authentication, rate limits, or anti-bot challenges. Mark those services as not fully tested and explain why.
- Prefer local testing against the refreshed dev Worker. Do not use `https://throwaway.sslboard.com/` unless local dev cannot run, and then call that out in the report.
- Preserve exact domains from generated addresses, including subdomains. The current detector checks the exact domain after `@`; do not collapse to the registrable domain unless you separately verified that is what the service generated.
- Treat `disposable: false` from `/check` as the coverage miss signal. Track `valid_tld` and `has_mx` in the report, but a live generated temp address with `disposable: false` is the candidate to add.

## 1. Refresh the disposable list and rebuild the bloom filter

Start clean and make sure upstream is current before searching for misses:

```bash
npm run build:filter
```

This may also remove supplemental domains that upstream now covers. Note those removals in the final report if they happen.

Optional sanity checks:

```bash
npm test
npm run build
```

## 2. Start the local Worker

Use a local dev Worker rather than production:

```bash
npm run dev -- --port 8787 > /tmp/throwaway-worker-dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do
  curl -fsS http://localhost:8787/stats && break
  sleep 1
done
```

If port 8787 is busy, choose another port and keep `BASE_URL` accurate. Stop the worker when finished:

```bash
kill $DEV_PID 2>/dev/null
```

## 3. Search Google and choose services

Use browser-harness for browser work. If the `browser-harness` skill is available and not already loaded, read it before interacting with Chrome.

The SERP collector manages its own dedicated agent tab and closes it when finished. For service harvesting, each deterministic adapter manages its own browser tab. Only use a manually reused browser tab when inspecting/debugging a service adapter.

Search multiple related queries and de-duplicate service URLs **before harvesting** so the same SERP result/service is not tested more than once.

**Critical bug-avoidance rule:** after SERP collection, persist one canonical `service_urls` queue and harvest **only from that queue**. Do not re-search, manually swap in a different ad hoc subset, or retest a host already present in the queue unless the report explicitly says why. The harvesting loop must consume the previously collected queue directly, one host at most once.

Recommended queries:

- `temp email`
- `disposable email`
- `temporary email`
- `throwaway email`
- `10 minute mail`
- `temp mail`

Use the saved SERP collection script instead of hand-rolled inline code:

```bash
SERP_OUT=/tmp/throwaway-serp-services.json \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/scripts/collect-serp-services.py)"
```

The script saves both the final queue and an audit trail of filtered results. Update `.pi/skills/weekly-temp-email-domain-checker/services.md` with any newly discovered hosts or status changes. Before harvesting, inspect or print the final queue so execution can be audited against the exact deduplicated list:

```bash
node -e 'const q=require("/tmp/throwaway-serp-services.json"); console.log(q.queue.map(x => `${x.host} ${x.url}`).join("\n"))'
```

At minimum, the saved queue/audit must record:

- normalized URL
- host
- source query/queries
- whether it was kept or filtered out

Filter obvious non-service results **before** building the final queue. Exclude pages whose primary purpose is articles, reviews, forums, app-store listings, docs, GitHub repos, Wikipedia, or security-product content. Keep only hosts that appear to offer a live temp/disposable inbox generator. The SERP collector also reads `.pi/skills/weekly-temp-email-domain-checker/service-exclusions.json`; update that file when an adapter or inspection proves a host is not a disposable email generator.

If a browser-harness script creates temporary tabs, close them before finishing by calling Chrome's target close command:

```python
try:
    agent_tab = new_tab("https://www.google.com/search?q=temp+email")
    wait_for_load()
    # collect/search SERP links, preferably with goto_url(...) in this tab
finally:
    cdp("Target.closeTarget", targetId=agent_tab)
```

Review the first page of results for each query. Prioritize major services that actually generate inboxes/addresses, plus newly discovered services not seen in earlier queries. Ignore blog posts, review pages, and VPN/security product landing pages unless they provide a live temp email generator.

## 4. Harvest live email domains

Use deterministic per-service adapters, not a generic operational harvester. For each queued service host:

1. Look for an adapter in `.pi/skills/weekly-temp-email-domain-checker/service-adapters/<host-slug>.py`.
2. If the adapter exists, run it with `browser-harness` and save its JSON output.
3. If no adapter exists, create one from `.pi/skills/weekly-temp-email-domain-checker/templates/service-adapter-template.py`, inspect the service with browser-harness, implement the service-specific extraction steps, then rerun the adapter to verify it returns structured evidence.
4. If inspection proves the host is not a disposable email generator, the adapter should return `status: "not-disposable-service"` with evidence. Add that host and reason to `.pi/skills/weekly-temp-email-domain-checker/service-exclusions.json` so future SERP collection skips it. Prefer the helper:

   ```bash
   node .pi/skills/weekly-temp-email-domain-checker/scripts/add-service-exclusion.mjs \
     example.com article "SERP result is an article, not a temp email generator"
   ```
5. If an adapter fails because the site changed, update the adapter and rerun it. Do not fall back to adding domains from a generic page scrape.
6. The generic harvester script may be used only as a diagnostic aid while authoring an adapter; its output alone is not sufficient evidence for adding a domain.

Each adapter must print one JSON object with:

- `service`
- `url`
- `status`
- `emails`
- `domains_from_emails`
- `exposed_domains`
- `evidence`
- `notes`
- `exclude_recommendation` when `status` is `not-disposable-service`

Treat adapter statuses as follows:

- `ok` with emails/domains → continue to detector checks.
- `blocked` / `captcha` / `auth-required` / `rate-limited` → report as not fully tested; do not exclude.
- `not-disposable-service` → add/update `service-exclusions.json` with the host, reason, evidence, and date.
- `needs-implementation` / `failed` → update the adapter or report as incomplete; do not add domains and do not exclude unless inspection proves it is not a service.

Run the adapter queue runner so each service in the final deduplicated queue is attempted exactly once:

```bash
node .pi/skills/weekly-temp-email-domain-checker/scripts/run-service-adapters.mjs \
  --queue /tmp/throwaway-serp-services.json \
  --out /tmp/throwaway-adapter-results.json \
  --results-dir /tmp/throwaway-adapter-results
```

The runner maps each queued host to `.pi/skills/weekly-temp-email-domain-checker/service-adapters/<host-slug>.py`, runs it with `SERVICE_URL` set to the queued URL, writes one JSON file per service, and writes a combined result file. Use `/tmp/throwaway-adapter-results.json` as the canonical harvesting evidence for detector checks and the report.

For any `missing-adapter`, `needs-implementation`, or stale/failing adapter result:

1. Inspect the service with browser-harness.
2. Create or update the deterministic adapter.
3. Rerun `run-service-adapters.mjs` for the queue, or rerun the specific adapter for verification and save the JSON evidence.
4. Record the service name, queued URL, adapter status, generated email/domain evidence, and exact domain after `@`.
5. If the service exposes a visible domain dropdown/list, collect every visible domain, but only label them verified if the adapter evidence shows the site presents them as usable temp-email domains.

Do **not** replace the queue with a hand-picked subset unless you first rewrite the saved queue and explain the filtering decision in the report. Do not use manual browser inspection as a substitute for adapter output except while creating or repairing an adapter.

Useful browser-harness patterns:

```bash
browser-harness -c 'new_tab("https://example-temp-mail-service.test"); wait_for_load(); capture_screenshot("/tmp/service.png")'
```

```bash
browser-harness -c 'print(js(r"""
Array.from(document.body.innerText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map(m => m[0])
"""))'
```

If a site is JS-heavy, inspect the DOM first; use coordinates only when needed. If a site blocks automation with CAPTCHA/anti-bot interstitials, stop and report it as untested.

## 5. Test candidates against the local detector

Prefer the API documented in `src/llms.txt` over the UI.

Single domain:

```bash
curl -sS 'http://localhost:8787/check?domain=example.com'
```

Batch domains:

```bash
curl -sS -X POST http://localhost:8787/check \
  -H 'Content-Type: application/json' \
  --data '{"domains":["example.com","mailinator.com"]}'
```

Or use the bundled helper:

```bash
node .pi/skills/weekly-temp-email-domain-checker/scripts/check-detector.mjs \
  --base http://localhost:8787 candidate@example.com other-domain.test
```

Interpretation:

- `disposable: true` → already covered; do not add.
- `disposable: false` + live generated temp address/domain → missed domain; append to `scripts/supplemental-domains.txt`.
- `valid_tld: false` or `has_mx: false` → report clearly. If the domain came from a live generated address, it can still be a disposable-coverage miss, but call out the MX/TLD anomaly.

The UI can be used as a cross-check at the local base URL. Enter the address in `#emailInput`, press Enter, then read `#resultVerdict`. Expected text is lowercase in the current UI: `disposable`, `legitimate`, `invalid`, or `no MX records`.

## 6. Update supplemental domains

For every verified missed domain:

1. Normalize to lowercase.
2. Check it is not already present in `scripts/supplemental-domains.txt`.
3. Append under a dated comment, one domain per line.

Example:

```text
# Added 2026-06-09 — weekly temp email domain check
new-temp-domain.example
```

After editing, rebuild so the generated bloom filter includes additions and duplicate supplemental entries are pruned if upstream already covers them:

```bash
npm run build:filter
```

Then rerun checks for the newly added domains and confirm `disposable: true` locally.

## 7. Validate and summarize changes

Run at least:

```bash
npm test
```

Also inspect diffs:

```bash
git diff -- scripts/supplemental-domains.txt src/generated/filter-meta.ts src/generated/filter.bin
```

Do not commit unless the user asks.

## 8. Write the report

Create `reports/weekly-temp-email-check-YYYY-MM-DD.md` with this structure:

```markdown
# Weekly Temp Email Domain Check — YYYY-MM-DD

## Summary
- Services reviewed:
- Candidate domains tested:
- New domains added:
- Local detector base URL:

## Services tested
| Service | URL | Email/domain harvested | Local detector result | Action |
|---|---|---|---|---|

## Domains added to `scripts/supplemental-domains.txt`
- domain.example — source service and evidence

## Already covered
- domain.example — source service

## Services not fully tested
- Service — reason, e.g. CAPTCHA, no generated address visible, navigation failed

## Validation
- `npm run build:filter`: pass/fail and key item-count change
- `npm test`: pass/fail
- Recheck newly added domains: pass/fail

## Notes
- Mention any upstream duplicate removals from `scripts/supplemental-domains.txt`.
- Mention any local-dev/browser-harness limitations.
```

Final response to the user should briefly list services tested, domains added, blocked services, report path, and validation status.
