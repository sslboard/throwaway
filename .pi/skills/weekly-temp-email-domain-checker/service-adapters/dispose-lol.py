"""Deterministic browser-harness adapter for dispose.lol."""

import json
import os

SERVICE = "dispose.lol"
URL = os.environ.get("SERVICE_URL", "https://dispose.lol/")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const text = document.body ? document.body.innerText : '';
  const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))]
    .filter(e => !e.endsWith('@dispose.lol'));
  return {location: location.href, title: document.title, emails,
          evidence: emails.length ? [{kind: 'generated-email-body', value: emails[0], selector: 'body heading'}] : []};
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(25)
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
    if result["domains_from_emails"]:
        result["notes"].append(
            "dispose.lol shares/aliases REAL gmail.com inboxes (temporary Gmail). "
            "These are NOT disposable domains; never add them to the disposable filter."
        )
    if not result["emails"]:
        result["notes"].append("Loaded service but did not find a generated address in page text.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    pass

print(json.dumps(result, indent=2, ensure_ascii=False))
