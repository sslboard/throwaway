"""Deterministic browser-harness adapter for vanishinbox.com."""
import json, os

SERVICE = "vanishinbox.com"
URL = os.environ.get("SERVICE_URL", "https://vanishinbox.com/10-minute-email")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
tab = None
try:
    tab = new_tab(URL)
    wait_for_load(30)
    wait(3)
    data = js(r'''(() => ({location: location.href, title: document.title, text: (document.body?.innerText || '').slice(0, 1200)}))()''') or {}
    result["url"] = data.get("location", URL)
    text = data.get("text", "")
    if "security verification" in text.lower() or "cloudflare" in text.lower() or "verify you are not a bot" in text.lower():
        result["status"] = "blocked"
        result["evidence"] = [{"kind": "anti-bot-page", "value": text[:500], "selector": "body"}]
        result["notes"].append("Cloudflare security verification blocked address generation; no bypass attempted.")
    else:
        result["status"] = "failed"
        result["notes"].append("Loaded service but did not find a generated email address.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if tab is not None:
        try: cdp("Target.closeTarget", targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
