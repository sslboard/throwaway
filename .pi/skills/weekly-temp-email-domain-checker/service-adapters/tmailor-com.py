"""Deterministic browser-harness adapter for tmailor.com."""
import json
import os
SERVICE = "tmailor.com"
URL = os.environ.get("SERVICE_URL", "https://tmailor.com/th/10-minute-mail")
EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const uniq = values => [...new Set(values.map(v => String(v || '').trim().toLowerCase()).filter(Boolean))];
  const sources = [];
  const add = (kind, value, selector = null) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) sources.push({kind, value: text, selector});
  };
  const input = document.querySelector('input[name="currentEmailAddress"], input[aria-label="Your temporary email address"]');
  if (input) add('generated-email-input', input.value || input.getAttribute('value') || '', input.name ? 'input[name="currentEmailAddress"]' : 'input[aria-label="Your temporary email address"]');

  const emails = uniq(sources.flatMap(s => s.value.match(EMAIL_RE) || []));
  return {location: location.href, title: document.title, readyState: document.readyState, emails, evidence: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 20)};
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
        generated = [e for e in emails if not e.startswith(("support@", "no-reply@", "noreply@", "hello@"))]
        if generated:
            break
    emails = data.get("emails") if data else []
    filtered = [e for e in emails if not e.startswith(("support@", "no-reply@", "noreply@", "hello@"))]
    result["emails"] = filtered or emails or []
    result["domains_from_emails"] = sorted({email.split("@", 1)[1].lower() for email in result["emails"] if "@" in email})
    result["evidence"] = (data or {}).get("evidence", [])
    result["url"] = (data or {}).get("location", URL)
    if result["emails"]:
        result["status"] = "ok"
    else:
        text = js("document.body ? document.body.innerText.slice(0, 1200) : ''") or ""
        lowered = text.lower()
        if "captcha" in lowered or "verify you are human" in lowered:
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
        try: cdp("Target.closeTarget", targetId=agent_tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
