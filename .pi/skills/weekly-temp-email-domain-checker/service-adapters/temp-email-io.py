"""Deterministic browser-harness adapter for temp-email.io."""
import json, os
SERVICE = "temp-email.io"
URL = os.environ.get("SERVICE_URL", "https://temp-email.io/")
EXTRACT_QUERY = r"""
(() => {
  const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const sources=[]; const add=(kind,value,selector)=>{const text=String(value||'').replace(/\s+/g,' ').trim(); if(text) sources.push({kind,value:text,selector});};
  const main=document.querySelector('input#mainEmail');
  if(main) add('generated-email-input', main.value || main.getAttribute('value'), '#mainEmail');
  for (const el of Array.from(document.querySelectorAll('input,textarea,[data-clipboard-text],[data-email],[aria-label],[title]'))) {
    add('control', [el.value, el.getAttribute('value'), el.getAttribute('data-clipboard-text'), el.getAttribute('data-email'), el.getAttribute('aria-label'), el.getAttribute('title')].filter(Boolean).join(' '), el.id ? '#'+el.id : el.tagName.toLowerCase());
  }
  const emails=[...new Set(sources.flatMap(s => s.value.match(EMAIL_RE)||[]).map(e=>e.toLowerCase()))];
  return {location:location.href,title:document.title,emails,evidence:sources.filter(s=>EMAIL_RE.test(s.value)).slice(0,10),text:(document.body?.innerText||'').slice(0,800)};
})()
"""
result={"service":SERVICE,"url":URL,"status":"started","emails":[],"domains_from_emails":[],"exposed_domains":[],"evidence":[],"notes":[],"exclude_recommendation":None}
tab=None
try:
    tab=new_tab(URL); wait(2)
    info=page_info()
    if not info.get('url') or info.get('url') == 'about:blank':
        result['status']='failed'; result['notes'].append('Navigation opened blank tab or did not start.')
    else:
        try: wait_for_load(12)
        except Exception: pass
        data={}
        for _ in range(10):
            wait(2); data=js(EXTRACT_QUERY) or {}
            if data.get('emails'): break
        result['emails']=data.get('emails') or []
        result['domains_from_emails']=sorted({e.split('@',1)[1] for e in result['emails'] if '@' in e})
        result['evidence']=data.get('evidence') or []
        result['url']=data.get('location') or URL
        if result['emails']: result['status']='ok'
        else:
            lowered=(data.get('text') or '').lower()
            result['status']='blocked' if any(x in lowered for x in ['captcha','verify you are human','cloudflare']) else 'failed'
            result['notes'].append('Loaded service but did not find generated address in #mainEmail or page controls.')
except Exception as e:
    result['status']='failed'; result['notes'].append(str(e))
finally:
    if tab:
        try: cdp('Target.closeTarget', targetId=tab)
        except Exception: pass
print(json.dumps(result, indent=2, ensure_ascii=False))
