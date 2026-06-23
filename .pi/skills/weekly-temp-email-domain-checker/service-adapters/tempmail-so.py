"""Deterministic browser-harness adapter for tempmail.so.

tempmail.so renders a single generated temp address on load in
`span.text-base.truncate` (no exposed domain dropdown). Extract via that
selector with a body-text regex fallback.
"""
import json
import os

SERVICE = "tempmail.so"
URL = os.environ.get("SERVICE_URL", "https://tempmail.so/")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const span = document.querySelector('span.text-base.truncate');
  const sources = [];
  const add = (kind, value, selector = null) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) sources.push({kind, value: text, selector});
  };
  if (span) add('generated-email-span', span.innerText, 'span.text-base.truncate');
  add('body-text', document.body ? document.body.innerText : '', 'document.body.innerText');
  const emails = [...new Set((sources.flatMap(s => (s.value.match(EMAIL_RE) || []).map(x => x.toLowerCase()))))];
  return {location: location.href, title: document.title, readyState: document.readyState, emails, evidence: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 10)};
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
        if data.get("emails"):
            break
    emails = data.get("emails") if data else []
    # Drop obvious non-inbox role addresses.
    filtered = [e for e in emails if not e.startswith(("support@", "no-reply@", "noreply@", "hello@", "contact@", "admin@"))]
    result["emails"] = filtered or emails or []
    result["domains_from_emails"] = sorted({email.split("@", 1)[1].lower() for email in result["emails"] if "@" in email})
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
            result["notes"].append("Loaded service but did not find a generated email at expected selector(s).")
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
