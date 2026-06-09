"""Deterministic browser-harness adapter for emailondeck.com.

EmailOnDeck currently gates free email generation behind CAPTCHA/anti-bot fields.
This adapter intentionally does not bypass that protection; it reports blocked.
"""
import json
import os

SERVICE = "emailondeck.com"
URL = os.environ.get("SERVICE_URL", "https://www.emailondeck.com/")

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
agent_tab = None
try:
    agent_tab = new_tab(URL)
    wait_for_load(30)
    wait(5)
    data = js(r"""
(() => ({
  location: location.href,
  title: document.title,
  captchaFields: Array.from(document.querySelectorAll('textarea[name="g-recaptcha-response"], textarea[name="h-captcha-response"], [class*="captcha"], iframe[src*="captcha"]')).map((el, i) => ({i, tag: el.tagName, id: el.id || null, name: el.name || null, cls: String(el.className || ''), src: el.src || null})),
  getEmailButton: !!document.querySelector('button#get_email_btn')
}))()
""") or {}
    result["url"] = data.get("location", URL)
    result["evidence"] = data.get("captchaFields", [])
    result["status"] = "blocked"
    result["notes"].append("Email generation is gated by CAPTCHA/anti-bot fields; no bypass attempted.")
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
