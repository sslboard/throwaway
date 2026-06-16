"""Deterministic browser-harness adapter for mailporary.com."""

import json
import os

SERVICE = "mailporary.com"
URL = os.environ.get("SERVICE_URL", "https://mailporary.com/10minutemail")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/i;
  const uniq = values => [...new Set(values.map(v => String(v || '').replace(/\u200b/g, '').trim().toLowerCase()).filter(Boolean))];
  const sources = [];
  const add = (kind, value, selector = null) => {
    const text = String(value || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
    if (text) sources.push({kind, value: text, selector});
  };

  const emailInput = Array.from(document.querySelectorAll('input')).find(el => EMAIL_RE.test(el.value || el.getAttribute('value') || '') || /@/.test(el.value || el.getAttribute('value') || ''));
  if (emailInput) add('generated-email-input', emailInput.value || emailInput.getAttribute('value') || '', emailInput.id ? `#${emailInput.id}` : 'input');
  add('body.innerText', document.body ? document.body.innerText : '', 'document.body.innerText');

  const emails = uniq(sources.flatMap(s => s.value.match(EMAIL_RE) || []));
  const exposed_domains = uniq(sources.filter(s => s.kind === 'domain-option').map(s => s.value).filter(v => DOMAIN_RE.test(v)));
  return {location: location.href, title: document.title, readyState: document.readyState, emails, exposed_domains, evidence: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 20)};
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(30)
    data = None
    for _ in range(12):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        emails = data.get("emails") or []
        if emails:
            break

    emails = data.get("emails") if data else []
    result["emails"] = emails or []
    result["domains_from_emails"] = sorted({email.split("@", 1)[1].lower() for email in result["emails"] if "@" in email})
    result["exposed_domains"] = (data or {}).get("exposed_domains", [])
    result["evidence"] = (data or {}).get("evidence", [])
    result["url"] = (data or {}).get("location", URL)
    if result["emails"]:
        result["status"] = "ok"
    else:
        text = js("document.body ? document.body.innerText.slice(0, 1200) : ''") or ""
        lowered = text.lower()
        if "captcha" in lowered or "verify you are human" in lowered or "cloudflare" in lowered:
            result["status"] = "blocked"
            result["notes"].append("Page appears to require anti-bot verification; no bypass attempted.")
        else:
            result["status"] = "failed"
            result["notes"].append("Loaded service but did not find a generated email address in the visible input.")
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
