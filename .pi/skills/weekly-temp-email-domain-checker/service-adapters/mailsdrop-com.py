"""Deterministic browser-harness adapter for mailsdrop.com."""
import json, os

SERVICE = "mailsdrop.com"
URL = os.environ.get("SERVICE_URL", "https://mailsdrop.com/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    wait(4)
    data = js(r'''(() => {
      const inp = document.querySelector('#current-email');
      return {email: inp ? inp.value : ''};
    })()''') or {}
    email = (data.get("email") or "").strip().lower()
    if "@" in email:
        result["emails"] = [email]
        result["domains_from_emails"] = [email.split("@", 1)[1]]
        result["evidence"] = [{"kind": "generated-email-input", "value": email, "selector": "#current-email"}]
        result["status"] = "ok"
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email found in #current-email.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
