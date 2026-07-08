import json, os

SERVICE = "tempmail.plus"
URL = os.environ.get("SERVICE_URL", "https://tempmail.plus/en/")
result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
tab = None
try:
    tab = new_tab(URL)
    wait_for_load(30)
    data = None
    for _ in range(8):
        wait(2)
        data = js(r'''
(() => {
  const local = (document.querySelector('#pre_button')?.value || '').trim().toLowerCase();
  const domainText = (document.querySelector('#domain')?.innerText || '').trim().replace(/^@/, '').toLowerCase();
  const exposed = [...new Set(Array.from(document.querySelectorAll('.dropdown-item')).map(e => e.innerText.trim().replace(/^@/, '').toLowerCase()).filter(d => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))];
  return {location: location.href, local, domainText, exposed};
})()
''') or {}
        if data.get("local") and data.get("domainText"):
            break
    email = f"{data['local']}@{data['domainText']}" if data and data.get("local") and data.get("domainText") else None
    result["url"] = (data or {}).get("location", URL)
    result["emails"] = [email] if email else []
    result["domains_from_emails"] = [data["domainText"]] if email else []
    result["exposed_domains"] = (data or {}).get("exposed", [])
    result["evidence"] = ([{"kind":"generated-email-controls", "value": email, "selector":"#pre_button + #domain"}] if email else [])
    result["status"] = "ok" if email else "failed"
    if not email: result["notes"].append("Could not read #pre_button and #domain.")
except Exception as e:
    result["status"] = "failed"; result["notes"].append(str(e))
finally:
    if tab is not None:
        try: cdp("Target.closeTarget", targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
