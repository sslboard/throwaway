"""Deterministic browser-harness adapter for mail.cx."""
import json, os, re

SERVICE = "mail.cx"
URL = os.environ.get("SERVICE_URL", "https://mail.cx/")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
tab = None
try:
    tab = new_tab(URL)
    wait_for_load(30)
    for _ in range(8):
        wait(2)
        data = js(r'''(() => {
          const text = document.body ? document.body.innerText : '';
          const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))];
          return {location: location.href, emails};
        })()''') or {}
        generated = [e for e in data.get("emails", []) if not e.startswith(("support@", "no-reply@", "noreply@"))]
        if generated:
            result["emails"] = generated[:1]
            result["evidence"] = [{"kind": "generated-email-body", "value": generated[0], "selector": "body"}]
            break
    result["url"] = (data or {}).get("location", URL)
    result["domains_from_emails"] = sorted({e.split("@", 1)[1] for e in result["emails"]})
    if result["emails"]:
        result["status"] = "ok"
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email found on mail.cx.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if tab is not None:
        try: cdp("Target.closeTarget", targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
