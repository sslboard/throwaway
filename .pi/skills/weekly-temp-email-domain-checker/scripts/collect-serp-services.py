"""Collect and deduplicate Google SERP temp-email service URLs.

Run from the repo root with browser-harness, for example:

  SERP_OUT=/tmp/throwaway-serp-services.json \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/scripts/collect-serp-services.py)"

Optional env vars:
  SERP_QUERIES='["temp email", "disposable email"]'  # JSON array, or comma-separated string
  SERP_OUT=/path/to/service-queue.json
"""

from urllib.parse import quote_plus, urlparse, urlunparse
import json
import os
import re

DEFAULT_QUERIES = [
    "temp email",
    "disposable email",
    "temporary email",
    "throwaway email",
    "10 minute mail",
    "temp mail",
]

raw_queries = os.environ.get("SERP_QUERIES")
if raw_queries:
    try:
        queries = json.loads(raw_queries)
    except Exception:
        queries = [q.strip() for q in raw_queries.split(",") if q.strip()]
else:
    queries = DEFAULT_QUERIES

out_path = os.environ.get("SERP_OUT", "/tmp/throwaway-serp-services.json")
exclusions_path = os.environ.get(
    "SERVICE_EXCLUSIONS",
    ".pi/skills/weekly-temp-email-domain-checker/service-exclusions.json",
)

try:
    with open(exclusions_path, "r", encoding="utf-8") as f:
        service_exclusions = json.load(f).get("hosts", {})
except FileNotFoundError:
    service_exclusions = {}

BLOCKED_HOST_PARTS = [
    "google.",
    "support.google",
    "accounts.google",
    "reddit.com",
    "quora.com",
    "youtube.com",
    "wikipedia.org",
    "github.com",
    "apps.apple.com",
    "play.google.com",
    "mozilla.org",
]

BLOCKED_URL_PARTS = [
    "/search?",
    "blog",
    "review",
    "forum",
    "docs",
    "support",
    "help",
    "wiki",
    "news",
    "article",
]

SERVICE_HINTS = [
    "mail",
    "email",
    "inbox",
    "temp",
    "temporary",
    "disposable",
    "minute",
    "throwaway",
    "guerrilla",
    "yopmail",
]


def normalize_result_url(url):
    p = urlparse(url)
    scheme = p.scheme.lower() or "https"
    host = p.netloc.lower().removeprefix("www.")
    path = re.sub(r"/{2,}", "/", p.path).rstrip("/")
    return urlunparse((scheme, host, path, "", "", ""))


def classify(url, text=""):
    p = urlparse(url)
    host = p.netloc.lower().removeprefix("www.")
    lowered = f"{url} {text}".lower()
    if not host:
        return False, "missing-host"
    if host in service_exclusions:
        reason = service_exclusions[host].get("reason", "service-exclusion") if isinstance(service_exclusions[host], dict) else "service-exclusion"
        return False, f"excluded:{reason}"
    if any(part in host for part in BLOCKED_HOST_PARTS):
        return False, "blocked-host"
    if any(part in lowered for part in BLOCKED_URL_PARTS):
        return False, "blocked-url"
    if not any(hint in lowered or hint in host for hint in SERVICE_HINTS):
        return False, "no-service-hint"
    return True, "kept"


SERP_LINK_QUERY = r"""
(() => {
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  return anchors.map(a => {
    let href = a.href || '';
    const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
    const aria = (a.getAttribute('aria-label') || '').trim();
    const h3 = a.querySelector('h3');
    return { href, text: text || aria || (h3 ? h3.innerText : '') || '' };
  }).filter(x => /^https?:\/\//i.test(x.href));
})()
"""

agent_tab = new_tab(f"https://www.google.com/search?q={quote_plus(queries[0])}")
wait_for_load(20)

queue = []
seen_hosts = set()
seen_urls = set()
queued_by_host = {}
queued_by_url = {}
audit = []

try:
    for query in queries:
        switch_tab(agent_tab)
        goto_url(f"https://www.google.com/search?q={quote_plus(query)}")
        wait_for_load(20)
        wait(1.5)
        links = js(SERP_LINK_QUERY) or []
        for rank, item in enumerate(links, start=1):
            url = item.get("href", "") if isinstance(item, dict) else ""
            text = item.get("text", "") if isinstance(item, dict) else ""
            normalized = normalize_result_url(url)
            host = urlparse(normalized).netloc
            keep, reason = classify(normalized, text)
            duplicate_of = None
            if keep and (host in seen_hosts or normalized in seen_urls):
                keep, reason = False, "duplicate-host-or-url"
                duplicate_of = host if host in queued_by_host else normalized
                existing = queued_by_host.get(host) or queued_by_url.get(normalized)
                if existing is not None and query not in existing["source_queries"]:
                    existing["source_queries"].append(query)
            entry = {
                "query": query,
                "rank": rank,
                "url": url,
                "normalized_url": normalized,
                "host": host,
                "text": text,
                "kept": keep,
                "reason": reason,
                "duplicate_of": duplicate_of,
            }
            audit.append(entry)
            if keep:
                seen_hosts.add(host)
                seen_urls.add(normalized)
                queued = {
                    "url": url,
                    "normalized_url": normalized,
                    "host": host,
                    "source_queries": [query],
                    "first_rank": rank,
                    "status": "queued",
                }
                queue.append(queued)
                queued_by_host[host] = queued
                queued_by_url[normalized] = queued
finally:
    try:
        cdp("Target.closeTarget", targetId=agent_tab)
    except Exception as e:
        print(f"Failed to close agent tab: {e}")

payload = {
    "queries": queries,
    "exclusions_path": exclusions_path,
    "queue": queue,
    "audit": audit,
    "counts": {
        "links_seen": len(audit),
        "services_queued": len(queue),
        "hosts_queued": len(seen_hosts),
    },
}

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

print(json.dumps({"out": out_path, "counts": payload["counts"], "queue": queue}, indent=2, ensure_ascii=False))
