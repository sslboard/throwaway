"""Deterministic browser-harness adapter for disposablemail.app."""
import json, os

SERVICE = "disposablemail.app"
URL = os.environ.get("SERVICE_URL", "https://disposablemail.app/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    wait(4)
    pre = js(r'''(() => [...new Set(((document.body ? document.body.innerText : '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))])()''') or []
    clicked = js(r'''(() => {
      const btn = [...document.querySelectorAll('button, a')].find(b => /activate inbox/i.test(b.innerText || ''));
      if (btn) { btn.click(); return true; }
      return false;
    })()''')
    wait(4)
    post = js(r'''(() => [...new Set(((document.body ? document.body.innerText : '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))])()''') or []
    fresh = [e for e in post if e not in pre and e != "anything@yourcompany.com"]
    email = (fresh or [e for e in pre if e != "anything@yourcompany.com"])
    if email:
        result["emails"] = email[:1]
        result["domains_from_emails"] = [email[0].split("@", 1)[1]]
        result["evidence"] = [{"kind": "generated-email-body", "value": email[0], "selector": "body", "activated": bool(clicked)}]
        result["status"] = "ok"
        if not clicked:
            result["notes"].append("Activate Inbox button not found; recorded pre-activation previewed address.")
    else:
        result["status"] = "failed"
        result["notes"].append("No generated email found on disposablemail.app.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
