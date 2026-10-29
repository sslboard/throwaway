"""Deterministic browser-harness adapter for ilovetempmail.com."""

import json
import os

SERVICE = "ilovetempmail.com"
URL = os.environ.get("SERVICE_URL", "https://ilovetempmail.com/")

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const text = document.body ? document.body.innerText : '';
  // The generated address sits under the "Your temporary address" heading.
  const idx = text.indexOf('Your temporary address');
  const section = idx >= 0 ? text.slice(idx, idx + 200) : '';
  const sectionEmails = section.match(EMAIL_RE) || [];
  const bodyEmails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))];
  // Marketing/FAQ examples to ignore when falling back to the body.
  const ignore = (e) => ['you@gmail.com','hello@yourdomain.com','alex@studio.co'].includes(e) || e.endsWith('@ilovetempmail.com');
  const fallback = bodyEmails.filter(e => !ignore(e));
  return {
    location: location.href,
    title: document.title,
    sectionEmails: sectionEmails.map(e => e.toLowerCase()),
    fallback,
    evidence: sectionEmails.length ? [{kind: 'generated-address-section', value: sectionEmails[0], selector: 'Your temporary address section'}] : [],
  };
})()
"""

result = {"service": SERVICE, "url": URL, "status": "started", "emails": [], "domains_from_emails": [], "exposed_domains": [], "evidence": [], "notes": [], "exclude_recommendation": None}
try:
    ensure_real_tab()
    goto_url(URL)
    wait_for_load(25)
    data = {}
    for _ in range(10):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        if data.get("sectionEmails") or data.get("fallback"):
            break
    emails = data.get("sectionEmails") or data.get("fallback") or []
    result["emails"] = emails[:3]
    result["domains_from_emails"] = sorted({e.split("@", 1)[1].lower() for e in emails if "@" in e})
    result["evidence"] = data.get("evidence", [])
    result["url"] = (data or {}).get("location", URL)
    result["status"] = "ok" if emails else "failed"
    if not emails:
        result["notes"].append("Loaded service but did not find a generated address.")
except Exception as e:
    result["status"] = "failed"
    result["notes"].append(str(e))
finally:
    pass

print(json.dumps(result, indent=2, ensure_ascii=False))
