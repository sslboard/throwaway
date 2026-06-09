"""Deterministic browser-harness adapter for deepweb.net temp-email."""
import json, os
SERVICE="deepweb.net"
URL=os.environ.get("SERVICE_URL","https://deepweb.net/temp-email")
EXTRACT_QUERY=r"""
(() => {
 const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
 const sources=[]; const add=(kind,value,selector)=>{const text=String(value||'').replace(/\s+/g,' ').trim(); if(text) sources.push({kind,value:text,selector});};
 const body=document.body?.innerText||''; add('body', body, 'document.body.innerText');
 for (const el of Array.from(document.querySelectorAll('input')).slice(0,50)) add('input', el.value || el.getAttribute('value') || '', el.name ? `input[name="${el.name}"]` : 'input');
 let emails=[];
 // The page renders local-part in an input and domain as adjacent text, e.g. "tamia.cole" + "@deep-mail.org".
 const domainMatch=body.match(/@[A-Z0-9.-]+\.[A-Z]{2,}/i);
 const local=Array.from(document.querySelectorAll('input[type="text"]')).map(el => (el.value||'').trim()).find(v => /^[a-z0-9._+-]{2,}$/i.test(v) && !['login','captcha'].includes(v.toLowerCase()));
 if (domainMatch && local) emails=[`${local.toLowerCase()}${domainMatch[0].toLowerCase()}`];
 return {location:location.href,title:document.title,emails,evidence:sources.filter(s=>/@deep-mail\.org/i.test(s.value) || s.kind === 'input').slice(0,10),text:body.slice(0,1000)};
})()
"""
result={"service":SERVICE,"url":URL,"status":"started","emails":[],"domains_from_emails":[],"exposed_domains":[],"evidence":[],"notes":[],"exclude_recommendation":None}
tab=None
try:
 tab=new_tab(URL); wait(2)
 try: wait_for_load(12)
 except Exception: pass
 data={}
 for _ in range(6):
  wait(2); data=js(EXTRACT_QUERY) or {}
  if data.get('emails'): break
 result['emails']=data.get('emails') or []
 result['domains_from_emails']=sorted({e.split('@',1)[1] for e in result['emails'] if '@' in e})
 result['evidence']=data.get('evidence') or []
 result['url']=data.get('location') or URL
 if result['emails']: result['status']='ok'
 else:
  text=(data.get('text') or '').lower()
  result['status']='blocked' if 'captcha' in text and 'temp email' not in text else 'failed'
  result['notes'].append('Loaded service but did not find local-part plus @deep-mail.org.')
except Exception as e:
 result['status']='failed'; result['notes'].append(str(e))
finally:
 if tab:
  try: cdp('Target.closeTarget', targetId=tab)
  except Exception: pass
print(json.dumps(result,indent=2,ensure_ascii=False))
