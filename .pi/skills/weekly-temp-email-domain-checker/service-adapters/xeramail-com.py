"""Deterministic browser-harness adapter for xeramail.com."""

import json
import os

SERVICE = "xeramail.com"
URL = os.environ.get("SERVICE_URL", "https://xeramail.com/")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const sources = [];
  const add = (kind, value, selector = null) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) sources.push({kind, value: text, selector});
  };
  const input = document.querySelector('input#email');
  if (input) add('generated-email-input', input.value || input.getAttribute('value') || '', '#email');
  const emails = [...new Set(sources.flatMap(s => s.value.match(EMAIL_RE) || []).map(e => e.toLowerCase()))];
  return {location: location.href, title: document.title, emails, evidence: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 10)};
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(25)
    data = {}
    for _ in range(12):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        if data.get("emails"):
            break
    result["emails"] = data.get("emails") or []
    result["domains_from_emails"] = sorted({e.split("@", 1)[1].lower() for e in result["emails"] if "@" in e})
    result["evidence"] = data.get("evidence", [])
    result["url"] = data.get("location", URL)
    result["status"] = "ok" if result["emails"] else "failed"
    if not result["emails"]:
        result["notes"].append("Loaded service but did not find a generated email in input#email.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if agent_tab is not None:
        try:
            cdp("Target.closeTarget", targetId=agent_tab)
        except Exception:
            pass
print(json.dumps(result, indent=2, ensure_ascii=False))
