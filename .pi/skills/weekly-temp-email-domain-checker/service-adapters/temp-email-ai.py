"""Deterministic browser-harness adapter for temp-email.ai.

Service announced "New inboxes are paused" (2026-11-11): the generator UI is
present but creating addresses is disabled site-wide. Report blocked, not
not-disposable-service, so the host is retried once the pause lifts.
"""

import json
import os

SERVICE = "temp-email.ai"
URL = os.environ.get("SERVICE_URL", "https://temp-email.ai/")

result = {
    "service": SERVICE,
    "url": URL,
    "status": "started",
    "emails": [],
    "domains_from_emails": [],
    "exposed_domains": [],
    "evidence": [],
    "notes": [],
    "exclude_recommendation": None,
}

try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(25)
    wait(4)

    text = js("document.body ? document.body.innerText.slice(0, 1500) : ''") or ""
    lowered = text.lower()
    import re
    emails = re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.IGNORECASE)
    result["emails"] = [e.lower() for e in emails][:5]
    result["domains_from_emails"] = sorted({e.split("@", 1)[1].lower() for e in result["emails"]})
    result["evidence"] = [{"kind": "body", "value": " ".join(text.split())[:400], "selector": "document.body.innerText"}]

    if result["emails"]:
        result["status"] = "ok"
    elif "paused" in lowered and ("stopped creating" in lowered or "new inboxes" in lowered):
        result["status"] = "blocked"
        result["notes"].append("Service has paused new inbox creation ('New inboxes are paused'); no bypass attempted.")
    elif "captcha" in lowered or "verify you are human" in lowered:
        result["status"] = "blocked"
        result["notes"].append("Page appears to require anti-bot verification; no bypass attempted.")
    else:
        result["status"] = "failed"
        result["notes"].append("Loaded service but found neither a generated email nor the pause notice.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    pass

print(json.dumps(result, indent=2, ensure_ascii=False))
