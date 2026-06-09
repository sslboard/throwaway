"""Deterministic browser-harness adapter for temp-mail.org.

Run with:
  SERVICE_URL=https://temp-mail.org/en/ \
  browser-harness -c "$(cat .pi/skills/weekly-temp-email-domain-checker/service-adapters/temp-mail-org.py)"

Contract: observe one live temp email address from temp-mail.org and return
structured evidence. Do not bypass CAPTCHA/auth/rate limits.
"""

import json
import os
import re

SERVICE = "temp-mail.org"
URL = os.environ.get("SERVICE_URL", "https://temp-mail.org/en/")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const uniq = values => [...new Set(values.map(v => String(v || '').trim().toLowerCase()).filter(Boolean))];
  const sources = [];
  const add = (kind, value, selector = null) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) sources.push({kind, value: text, selector});
  };

  // temp-mail.org renders the generated address in input#mail.
  // Treat #mail as the deterministic primary source; broader form-control reads
  // are only retained as secondary evidence if the site's markup changes.
  const mailInput = document.querySelector('input#mail');
  if (mailInput) add('generated-email-input', mailInput.value || mailInput.getAttribute('value') || '', '#mail');

  for (const el of Array.from(document.querySelectorAll('input, textarea'))) {
    if (el === mailInput) continue;
    add('secondary-form-control', el.value || el.getAttribute('value') || '', el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : el.tagName.toLowerCase()));
  }

  for (const el of Array.from(document.querySelectorAll('[data-clipboard-text], [data-email], [data-address], [aria-label], [title]'))) {
    add('attribute', [
      el.getAttribute('data-clipboard-text'),
      el.getAttribute('data-email'),
      el.getAttribute('data-address'),
      el.getAttribute('aria-label'),
      el.getAttribute('title')
    ].filter(Boolean).join(' '), el.id ? `#${el.id}` : null);
  }

  add('body.innerText', document.body ? document.body.innerText : 'body.innerText');

  const emails = uniq(sources.flatMap(s => s.value.match(EMAIL_RE) || []));
  return {
    location: location.href,
    title: document.title,
    readyState: document.readyState,
    emails,
    evidence: sources.filter(s => EMAIL_RE.test(s.value)).slice(0, 10)
  };
})()
"""

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
    wait_for_load(30)

    # The generated address can render after the main document load. Poll the
    # service-specific extraction query instead of relying on one fixed sleep.
    data = None
    for _ in range(12):
        wait(2)
        data = js(EXTRACT_QUERY) or {}
        emails = data.get("emails") or []
        # Ignore obvious support/contact addresses if a generated address is present.
        generated = [e for e in emails if not e.startswith(("support@", "no-reply@", "noreply@"))]
        if generated:
            break

    emails = data.get("emails") if data else []
    filtered = [e for e in emails if not e.startswith(("support@", "no-reply@", "noreply@"))]
    result["emails"] = filtered or emails or []
    result["domains_from_emails"] = sorted({email.split("@", 1)[1].lower() for email in result["emails"] if "@" in email})
    result["evidence"] = (data or {}).get("evidence", [])
    result["url"] = (data or {}).get("location", URL)

    if result["emails"]:
        result["status"] = "ok"
    else:
        text = js("document.body ? document.body.innerText.slice(0, 1000) : ''") or ""
        lowered = text.lower()
        if "captcha" in lowered or "verify you are human" in lowered or "cloudflare" in lowered:
            result["status"] = "blocked"
            result["notes"].append("Page appears to require anti-bot verification; no bypass attempted.")
        else:
            result["status"] = "failed"
            result["notes"].append("Loaded temp-mail.org but did not find a generated email address in input#mail.")
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
