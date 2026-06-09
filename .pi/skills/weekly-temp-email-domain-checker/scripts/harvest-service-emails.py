"""Harvest visible temp-email addresses/domains from a saved service queue.

Run from the repo root with browser-harness, for example:

  SERVICE_QUEUE=/tmp/throwaway-serp-services.json \
  HARVEST_OUT=/tmp/throwaway-harvest.json \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/scripts/harvest-service-emails.py)"

The script visits each queued host at most once and runs HARVEST_QUERY against
that service page. It does not bypass CAPTCHAs, auth walls, or rate limits.
"""

from urllib.parse import urlparse
import json
import os
import re

queue_path = os.environ.get("SERVICE_QUEUE", "/tmp/throwaway-serp-services.json")
out_path = os.environ.get("HARVEST_OUT", "/tmp/throwaway-harvest.json")
max_services = int(os.environ.get("HARVEST_MAX_SERVICES", "50"))

EMAIL_RE = r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"

# This is the exact JavaScript query run against every queued service.
# Keep this query generic and read-only: it inspects visible text, form values,
# mailto links, common copy/email widgets, select options, and web storage.
HARVEST_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const DOMAIN_RE = /(?:^|\s|@)([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+)(?=\s|$)/gi;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const uniq = values => [...new Set(values.map(v => clean(v).toLowerCase()).filter(Boolean))];
  const sources = [];

  function addSource(kind, value, meta = {}) {
    const text = clean(value);
    if (text) sources.push({ kind, value: text, ...meta });
  }

  addSource('body.innerText', document.body ? document.body.innerText : '');

  for (const el of Array.from(document.querySelectorAll('input, textarea'))) {
    addSource('form-value', el.value || el.getAttribute('value') || el.placeholder || '', {
      selector: el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : el.tagName.toLowerCase())
    });
  }

  for (const el of Array.from(document.querySelectorAll('[data-clipboard-text], [data-email], [data-address], [data-domain], [aria-label], [title]'))) {
    addSource('element-attribute', [
      el.getAttribute('data-clipboard-text'),
      el.getAttribute('data-email'),
      el.getAttribute('data-address'),
      el.getAttribute('data-domain'),
      el.getAttribute('aria-label'),
      el.getAttribute('title')
    ].filter(Boolean).join(' '));
  }

  for (const a of Array.from(document.querySelectorAll('a[href^="mailto:"]'))) {
    addSource('mailto', a.href.replace(/^mailto:/i, ''));
  }

  for (const option of Array.from(document.querySelectorAll('select option'))) {
    addSource('select-option', `${option.value || ''} ${option.textContent || ''}`);
  }

  for (const storeName of ['localStorage', 'sessionStorage']) {
    try {
      const store = window[storeName];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        addSource(storeName, `${key || ''} ${store.getItem(key) || ''}`);
      }
    } catch (_) {}
  }

  const joined = sources.map(s => s.value).join('\n');
  const emails = uniq(joined.match(EMAIL_RE) || []);
  const domainsFromEmails = uniq(emails.map(e => e.split('@').pop()));

  const domainCandidates = [];
  for (const source of sources) {
    if (source.kind === 'select-option' || source.kind === 'element-attribute') {
      let match;
      while ((match = DOMAIN_RE.exec(source.value)) !== null) domainCandidates.push(match[1]);
    }
  }

  return {
    location: location.href,
    title: document.title,
    emails,
    domains_from_emails: domainsFromEmails,
    visible_domain_candidates: uniq(domainCandidates).slice(0, 100),
    sources_with_emails: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 20),
    query_version: 1
  };
})()
"""

with open(queue_path, "r", encoding="utf-8") as f:
    payload = json.load(f)

queue = [item for item in payload.get("queue", []) if item.get("status", "queued") == "queued"]

agent_tab = None
results = []
seen_hosts = set()

try:
    for item in queue[:max_services]:
        url = item.get("url") or item.get("normalized_url")
        host = item.get("host") or urlparse(url).netloc.lower().removeprefix("www.")
        if not url or not host or host in seen_hosts:
            continue
        seen_hosts.add(host)

        record = {
            "url": url,
            "normalized_url": item.get("normalized_url"),
            "host": host,
            "source_queries": item.get("source_queries", []),
            "status": "started",
        }
        try:
            if agent_tab is None:
                agent_tab = new_tab(url)
            else:
                switch_tab(agent_tab)
                goto_url(url)
            wait_for_load(25)
            wait(4)
            data = js(HARVEST_QUERY) or {}
            record.update({"status": "harvested", "harvest": data})
        except Exception as e:
            record.update({"status": "failed", "error": str(e)})
        results.append(record)
finally:
    if agent_tab is not None:
        try:
            cdp("Target.closeTarget", targetId=agent_tab)
        except Exception as e:
            print(f"Failed to close agent tab: {e}")

domains = []
for result in results:
    harvest = result.get("harvest") or {}
    domains.extend(harvest.get("domains_from_emails") or [])

out = {
    "queue_path": queue_path,
    "harvest_query": HARVEST_QUERY,
    "results": results,
    "candidate_domains_from_emails": sorted(set(d.lower() for d in domains if d)),
    "counts": {
        "services_attempted": len(results),
        "services_harvested": sum(1 for r in results if r.get("status") == "harvested"),
        "candidate_domains_from_emails": len(set(d.lower() for d in domains if d)),
    },
}

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

print(json.dumps({"out": out_path, "counts": out["counts"], "candidate_domains_from_emails": out["candidate_domains_from_emails"]}, indent=2, ensure_ascii=False))
