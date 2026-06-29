"""Deterministic browser-harness adapter for facebook.com SERP false positive."""

import json
import os

SERVICE = "facebook.com"
URL = os.environ.get("SERVICE_URL", "https://www.facebook.com/")

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(25)
    wait(3)
    data = js("""
    (() => ({
      location: location.href,
      title: document.title,
      text: document.body ? document.body.innerText.slice(0, 500) : ''
    }))()
    """) or {}
    result["url"] = data.get("location", URL)
    result["status"] = "not-disposable-service"
    result["evidence"] = [{"kind": "page-title", "value": data.get("title", "")}, {"kind": "body-snippet", "value": data.get("text", "")}]
    result["exclude_recommendation"] = {"reason": "social-media-post", "evidence": "SERP result is a Facebook video/post about temporary email, not a temp email generator."}
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    if agent_tab is not None:
        try:
            cdp("Target.closeTarget", targetId=agent_tab)
        except Exception:
            pass
print(json.dumps(result, indent=2, ensure_ascii=False))
