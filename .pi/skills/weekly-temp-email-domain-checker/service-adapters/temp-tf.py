"""Deterministic browser-harness adapter for temp.tf."""
import json, os, re

SERVICE = "temp.tf"
URL = os.environ.get("SERVICE_URL", "https://temp.tf/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    wait(4)
    data = js(r'''(() => {
      const text = document.body ? document.body.innerText : '';
      const m = text.match(/TEMPORARY ADDRESS\s*\n\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
      const providers = text.match(/PROVIDERS\s*\n((?:[a-z0-9.-]+\n)+)/i);
      return {addr: m ? m[1].toLowerCase() : '', providers: providers ? providers[1].trim().split('\n') : []};
    })()''') or {}
    addr = (data.get("addr") or "").strip()
    if "@" in addr:
        result["emails"] = [addr]
        result["domains_from_emails"] = [addr.split("@", 1)[1]]
        result["exposed_domains"] = data.get("providers", [])
        result["evidence"] = [{"kind": "generated-email-body", "value": addr, "selector": "TEMPORARY ADDRESS section"}]
        result["status"] = "ok"
        result["notes"].append(
            "temp.tf generates plus-aliases/dot-syntax aliases on REAL provider domains "
            "(outlook.com, hotmail.com, gmail.com, edu pools). These are NOT disposable domains; "
            "never add them to the disposable filter."
        )
    else:
        result["status"] = "failed"
        result["notes"].append("No TEMPORARY ADDRESS found on temp.tf.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
