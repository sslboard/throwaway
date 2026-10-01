"""Deterministic browser-harness adapter for tempemail.cc."""
import json, os, re

SERVICE = "tempemail.cc"
URL = os.environ.get("SERVICE_URL", "https://tempemail.cc/")
SKIP = re.compile(r"^(support|no-reply|noreply|admin|info)@", re.I)
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    for _ in range(6):
        wait(2)
        data = js(r'''(() => {
          const text = document.body ? document.body.innerText : '';
          const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))];
          return {emails};
        })()''') or {}
        gen = [e for e in data.get("emails", []) if not SKIP.match(e)]
        if gen:
            break
    if gen:
        result["emails"] = gen[:1]
        result["domains_from_emails"] = [gen[0].split("@", 1)[1]]
        result["evidence"] = [{"kind": "generated-email-body", "value": gen[0], "selector": "body"}]
        result["status"] = "ok"
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email found on tempemail.cc.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
