"""Deterministic browser-harness adapter for mailsac.com."""
import json, os, random, re, string

SERVICE = "mailsac.com"
URL = os.environ.get("SERVICE_URL", "https://mailsac.com/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(30)
    wait(3)
    name = "probe" + "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    # Fill the homepage inbox form with a random name and submit it.
    clicked = js('''(() => {
      const f = document.querySelector('#field_a1xtj');
      if (f) { f.value = \"''' + name + '''\"; f.dispatchEvent(new Event('input', {bubbles: true})); }
      const btn = [...document.querySelectorAll('button')].find(b => /check the mail/i.test(b.innerText || ''));
      if (btn) { btn.click(); return 'button'; }
      return f ? 'form' : 'none';
    })()''')
    wait(5)
    data = js(r'''(() => ({url: location.href, text: (document.body ? document.body.innerText : '').slice(0, 600)}))()''') or {}
    inbox_url = data.get("url", "")
    if "/inbox/" not in inbox_url:
        goto_url("https://mailsac.com/inbox/" + name)
        wait_for_load(30)
        wait(3)
        data = js(r'''(() => ({url: location.href, text: (document.body ? document.body.innerText : '').slice(0, 600)}))()''') or {}
        inbox_url = data.get("url", "")
    if "/inbox/" in inbox_url:
        addr_name = inbox_url.rstrip("/").rsplit("/", 1)[-1]
        addr_name = re.split(r"%40|@", addr_name)[0]  # strip any @mailsac.com the form appended
        email = (addr_name + "@mailsac.com").lower()
        result["emails"] = [email]
        result["domains_from_emails"] = ["mailsac.com"]
        result["evidence"] = [{"kind": "inbox-url", "value": inbox_url, "address": email}]
        result["status"] = "ok"
        result["notes"].append("Mailsac is a QA disposable test-email service; address is <name>@mailsac.com.")
    else:
        result["status"] = "failed"
        result["notes"].append("Could not reach an inbox page: " + inbox_url)
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
print(json.dumps(result, indent=2, ensure_ascii=False))
