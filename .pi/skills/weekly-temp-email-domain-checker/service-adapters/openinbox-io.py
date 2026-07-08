import json, os, re

SERVICE = "openinbox.io"
URL = os.environ.get("SERVICE_URL", "https://openinbox.io/")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
tab = None
try:
    tab = new_tab(URL)
    wait_for_load(30)
    data = None
    for _ in range(8):
        wait(2)
        data = js(r'''
(() => {
  const text = document.body ? document.body.innerText : '';
  const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))];
  return {location: location.href, title: document.title, emails, text: text.slice(0, 1000)};
})()
''') or {}
        if data.get("emails"):
            break
    result["url"] = (data or {}).get("location", URL)
    result["emails"] = [e for e in (data or {}).get("emails", []) if not e.startswith(("support@", "help@"))]
    result["domains_from_emails"] = sorted({e.split("@",1)[1] for e in result["emails"]})
    result["evidence"] = [{"kind":"body.innerText", "value": e, "selector":"body"} for e in result["emails"]]
    result["status"] = "ok" if result["emails"] else "failed"
    if not result["emails"]: result["notes"].append("No generated email found on landing page.")
except Exception as e:
    result["status"] = "failed"; result["notes"].append(str(e))
finally:
    if tab is not None:
        try: cdp("Target.closeTarget", targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
