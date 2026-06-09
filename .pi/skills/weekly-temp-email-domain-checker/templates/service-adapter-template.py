"""Deterministic browser-harness adapter for SERVICE_HOST.

Run with:
  SERVICE_URL=https://example.com/ \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/service-adapters/SERVICE_SLUG.py)"

Contract: create/observe one live temp email address and/or parse service-exposed
usable domains. If the site is clearly not a disposable email generator, return
status "not-disposable-service" with evidence so the host can be added to the
service exclusion list. Do not bypass CAPTCHA/auth/rate limits. Print one JSON object.
"""

import json
import os

SERVICE = "SERVICE_HOST"
URL = os.environ.get("SERVICE_URL", "SERVICE_URL_HERE")

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
    wait(3)

    # TODO: Replace this scaffold with service-specific deterministic steps:
    # - click cookie/consent only if necessary and non-invasive
    # - click generate/copy/reload controls by stable selectors
    # - read specific input/value/text nodes that contain the generated address
    # - parse known domain dropdown/options if the service exposes them
    # - never solve/bypass CAPTCHA, auth, or anti-bot flows
    #
    # If inspection proves this host is not a disposable-email generator, use:
    # result["status"] = "not-disposable-service"
    # result["exclude_recommendation"] = {
    #     "reason": "article/app-store/forum/security-product/not-generator/etc",
    #     "evidence": "Short human-readable evidence from the page",
    # }

    result["status"] = "needs-implementation"
    result["notes"].append("Adapter scaffold created; implement service-specific extraction steps.")
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
