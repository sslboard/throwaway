"""Deterministic browser-harness adapter for tempgbox.net."""
import json, os
SERVICE="tempgbox.net"
URL=os.environ.get("SERVICE_URL","https://tempgbox.net/")
EXTRACT_QUERY=r"""
(() => {
 const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
 const sources=[]; const add=(kind,value,selector)=>{const text=String(value||'').replace(/\s+/g,' ').trim(); if(text) sources.push({kind,value:text,selector});};
 add('body', document.body?.innerText || '', 'document.body.innerText');
 for (const el of Array.from(document.querySelectorAll('input,span,div,button,[aria-label],[title]')).slice(0,200)) add('control',[el.value,el.innerText,el.textContent,el.getAttribute('aria-label'),el.getAttribute('title')].filter(Boolean).join(' '),el.id?'#'+el.id:el.tagName.toLowerCase());
 const bodyEmails=(document.body?.innerText||'').match(EMAIL_RE)||[];
 const emails=[...new Set(bodyEmails.map(e=>e.toLowerCase()))];
 return {location:location.href,title:document.title,emails,evidence:sources.filter(s=>EMAIL_RE.test(s.value)).slice(0,10),text:(document.body?.innerText||'').slice(0,1000)};
})()
"""
result={"service":SERVICE,"url":URL,"status":"started","emails":[],"domains_from_emails":[],"exposed_domains":[],"evidence":[],"notes":[],"exclude_recommendation":None}
tab=None
try:
 tab=new_tab(URL); wait(2)
 try: wait_for_load(12)
 except Exception: pass
 # Dismiss cookie prompt if present and click Generate only when no address is already visible.
 try: js("Array.from(document.querySelectorAll('button')).find(b=>/Accept All|Essential Only/.test(b.innerText||''))?.click()")
 except Exception: pass
 data={}
 for i in range(10):
  wait(2); data=js(EXTRACT_QUERY) or {}
  if data.get('emails'): break
  if i == 1:
   try: js("Array.from(document.querySelectorAll('button')).find(b=>/^Generate$/.test((b.innerText||'').trim()))?.click()")
   except Exception: pass
 result['emails']=data.get('emails') or []
 result['domains_from_emails']=sorted({e.split('@',1)[1] for e in result['emails'] if '@' in e})
 result['evidence']=data.get('evidence') or []
 result['url']=data.get('location') or URL
 if result['emails']: result['status']='ok'
 else:
  text=(data.get('text') or '').lower()
  result['status']='blocked' if 'captcha' in text or 'verify you are human' in text else 'failed'
  result['notes'].append('Loaded service and clicked Generate, but did not find generated email.')
except Exception as e:
 result['status']='failed'; result['notes'].append(str(e))
finally:
 if tab:
  try: cdp('Target.closeTarget', targetId=tab)
  except Exception: pass
print(json.dumps(result,indent=2,ensure_ascii=False))
