"""Deterministic browser-harness adapter for lroid.com.

Run with:
  SERVICE_URL=https://lroid.com/ \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/service-adapters/lroid-com.py)"
"""

import json
import os

SERVICE = "lroid.com"
URL = os.environ.get("SERVICE_URL", "https://lroid.com/")

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

agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(25)
    wait(4)

    # Read the generated email from the input field
    email_val = js('return document.querySelector("input#adresa, input#eposta_adres, .adres-input") ? document.querySelector("input#adresa, input#eposta_adres, .adres-input").value.trim() : ""')

    if not email_val:
        # Fallback: scan visible text for email patterns
        email_val = js('return (document.body.innerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i) || [""])[0]')

    if email_val and "@" in email_val:
        result["emails"].append(email_val)
        domain = email_val.split("@")[-1].lower()
        result["domains_from_emails"].append(domain)
        result["evidence"].append({"kind": "generated-email-input", "value": email_val, "selector": "#eposta_adres"})
        result["status"] = "ok"
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email address found on the page.")

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
