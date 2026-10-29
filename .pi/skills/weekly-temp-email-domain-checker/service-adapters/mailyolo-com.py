"""Deterministic browser-harness adapter for mailyolo.com."""

import json
import os

SERVICE = "mailyolo.com"
URL = os.environ.get("SERVICE_URL", "https://www.mailyolo.com/")

CLICK_RANDOM = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const existing = (document.body.innerText.match(EMAIL_RE) || []).filter(e => !e.endsWith('@mailyolo.com') || true);
  if (existing.length) return 'already-generated';
  const b = Array.from(document.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Random');
  if (b) { b.click(); return 'clicked'; }
  return 'button-not-found';
})()
"""

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const text = document.body ? document.body.innerText : '';
  const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))]
    .filter(e => !['support@mailyolo.com', 'contact@mailyolo.com'].includes(e));
  return {location: location.href, title: document.title, emails,
          evidence: emails.length ? [{kind: 'generated-email-body', value: emails[0], selector: 'body after Random click'}] : []};
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(25)
    wait(2)
    js(CLICK_RANDOM)
    data = {}
    for _ in range(8):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        if data.get("emails"):
            break
    result["emails"] = (data.get("emails") or [])[:3]
    result["domains_from_emails"] = sorted({e.split("@", 1)[1].lower() for e in result["emails"] if "@" in e})
    result["evidence"] = data.get("evidence", [])
    result["url"] = (data or {}).get("location", URL)
    result["status"] = "ok" if result["emails"] else "failed"
    if not result["emails"]:
        result["notes"].append("Loaded service and clicked Random, but did not find a generated address.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    pass

print(json.dumps(result, indent=2, ensure_ascii=False))
