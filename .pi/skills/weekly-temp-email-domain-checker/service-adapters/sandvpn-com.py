"""Deterministic browser-harness adapter for sandvpn.com/mailbox."""
import json
import os

SERVICE = "sandvpn.com"
URL = os.environ.get("SERVICE_URL", "https://sandvpn.com/mailbox")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const inputs = Array.from(document.querySelectorAll('input'))
    .map(i => String(i.value || '').trim()).filter(Boolean);
  const email = inputs.find(v => EMAIL_RE.test(v)) || null;
  const options = Array.from(document.querySelectorAll('select option, [role="listbox"] [role="option"]'))
    .map(o => String(o.value || o.textContent || '').trim())
    .filter(v => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v));
  const body = document.body ? document.body.innerText : '';
  return {url: location.href, title: document.title, email, options, body: body.slice(0, 800)};
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(30)
    data = None
    for _ in range(15):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        if data.get("email"):
            break

    body = (data or {}).get("body", "").lower()
    if "captcha" in body or "verify you are human" in body:
        result["status"] = "blocked"
        result["notes"].append("Anti-bot verification present; no bypass attempted.")
    else:
        email = (data or {}).get("email")
        options = (data or {}).get("options") or []
        result["url"] = (data or {}).get("url", URL)
        if email:
            result["emails"] = [email.lower()]
            result["domains_from_emails"] = [email.split("@", 1)[1].lower()]
            result["evidence"].append({"kind": "generated-email-input", "value": email})
        for opt in options:
            result["evidence"].append({"kind": "domain-option", "value": opt})
        result["exposed_domains"] = sorted({o.lower() for o in options})
        result["status"] = "ok" if email else "failed"
        if not email:
            result["notes"].append("Loaded mailbox page but no generated address appeared in inputs.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if agent_tab is not None:
        try: cdp("Target.closeTarget", targetId=agent_tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
