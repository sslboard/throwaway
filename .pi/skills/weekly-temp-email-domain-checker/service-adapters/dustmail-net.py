"""Deterministic browser-harness adapter for dustmail.net."""
import json
import os

SERVICE = "dustmail.net"
URL = os.environ.get("SERVICE_URL", "https://dustmail.net/temp-mail/10-minutes")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const body = document.body ? document.body.innerText : '';
  const inputs = Array.from(document.querySelectorAll('input,textarea'))
    .map(i => String(i.value || '').trim()).filter(Boolean);
  const emails = [...new Set([...(body.match(EMAIL_RE) || []), ...inputs.flatMap(v => v.match(EMAIL_RE) || [])].map(s => s.toLowerCase()))];
  return {url: location.href, title: document.title, emails, body: body.slice(0, 1200)};
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
        emails = [e for e in (data.get("emails") or []) if not e.startswith(("support@", "no-reply@", "noreply@", "hello@", "info@"))]
        if emails:
            break

    body = (data or {}).get("body", "").lower()
    if "captcha" in body or "verify you are human" in body:
        result["status"] = "blocked"
        result["notes"].append("Anti-bot verification present; no bypass attempted.")
    else:
        emails = [e for e in (data.get("emails") or []) if not e.startswith(("support@", "no-reply@", "noreply@", "hello@", "info@"))]
        result["emails"] = emails
        result["domains_from_emails"] = sorted({e.split("@", 1)[1].lower() for e in emails if "@" in e})
        result["evidence"] = [{"kind": "body-email-text", "value": e} for e in emails[:10]]
        result["url"] = (data or {}).get("location", URL)
        result["status"] = "ok" if emails else "failed"
        if not emails:
            result["notes"].append("Loaded service but no generated email found.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if agent_tab is not None:
        try: cdp("Target.closeTarget", targetId=agent_tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
