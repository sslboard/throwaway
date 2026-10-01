"""Deterministic browser-harness adapter for disposabletempmail.com."""
import json, os

SERVICE = "disposabletempmail.com"
URL = os.environ.get("SERVICE_URL", "https://disposabletempmail.com/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    wait(4)
    data = js(r'''(() => {
      const inp = document.querySelector('#mainEmail');
      const history = [...document.querySelectorAll('input[type="checkbox"][value*="@"]')].map(i => i.value);
      return {email: inp ? inp.value : '', history};
    })()''') or {}
    email = (data.get("email") or "").strip().lower()
    if "@" in email:
        result["emails"] = [email]
        result["domains_from_emails"] = [email.split("@", 1)[1]]
        result["exposed_domains"] = sorted({h.split("@", 1)[1] for h in data.get("history", []) if "@" in h})
        result["evidence"] = [{"kind": "generated-email-input", "value": email, "selector": "#mainEmail"}]
        result["status"] = "ok"
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email found in #mainEmail.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
