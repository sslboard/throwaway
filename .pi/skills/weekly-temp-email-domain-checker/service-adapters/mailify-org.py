import json, os

SERVICE = "mailify.org"
URL = os.environ.get("SERVICE_URL", "https://mailify.org/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
tab = None
try:
    tab = new_tab(URL)
    wait_for_load(20)
    wait(2)
    data = js("({location: location.href, title: document.title, text: document.body ? document.body.innerText.slice(0,500) : ''})") or {}
    result["url"] = data.get("location", URL)
    text = data.get("text", "")
    if "DNS_PROBE_FINISHED_NXDOMAIN" in text or result["url"].startswith("chrome-error://"):
        result["status"] = "not-disposable-service"
        result["evidence"] = [{"kind":"browser-error", "value":"DNS_PROBE_FINISHED_NXDOMAIN", "selector":"body"}]
        result["exclude_recommendation"] = {"reason":"unreachable-nxdomain", "evidence":"Chrome reports DNS_PROBE_FINISHED_NXDOMAIN for mailify.org."}
    else:
        result["status"] = "failed"
        result["notes"].append("Site loaded but no adapter extraction implemented for changed page.")
except Exception as e:
    result["status"] = "failed"; result["notes"].append(str(e))
finally:
    if tab is not None:
        try: cdp("Target.closeTarget", targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
