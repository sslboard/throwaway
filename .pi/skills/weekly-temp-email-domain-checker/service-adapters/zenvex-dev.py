"""Deterministic browser-harness adapter for zenvex.dev."""
import json, os
SERVICE="zenvex.dev"
URL=os.environ.get("SERVICE_URL","https://zenvex.dev/")
EXTRACT_QUERY=r"""
(() => {
 const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
 const sources=[]; const add=(kind,value,selector)=>{const text=String(value||'').replace(/\s+/g,' ').trim(); if(text) sources.push({kind,value:text,selector});};
 add('body', document.body?.innerText || '', 'document.body.innerText');
 for (const el of Array.from(document.querySelectorAll('input,span,button,[aria-label],[title]')).slice(0,100)) add('control',[el.value,el.innerText,el.textContent,el.getAttribute('aria-label'),el.getAttribute('title')].filter(Boolean).join(' '),el.id?'#'+el.id:el.tagName.toLowerCase());
 const emails=[...new Set(sources.flatMap(s=>s.value.match(EMAIL_RE)||[]).map(e=>e.toLowerCase()))];
 const domainNodes=Array.from(document.querySelectorAll('.domain-menu [role="option"], .domain-option, [role="listbox"] [role="option"]'));
 const optionDomains=domainNodes.flatMap(el => (el.innerText || el.textContent || '').match(/\b[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || []);
 const domains=[...new Set(optionDomains)].map(d=>d.toLowerCase()).filter(d=>!['zenvex.dev'].includes(d));
 return {location:location.href,title:document.title,emails,exposed_domains:domains,evidence:sources.filter(s=>EMAIL_RE.test(s.value)).slice(0,10),domain_evidence:domainNodes.map(el => ({kind:'domain-option', value:(el.innerText || el.textContent || '').replace(/\s+/g,' ').trim(), selector: el.getAttribute('role') === 'option' ? '[role="option"]' : '.domain-option'})).slice(0,20),text:(document.body?.innerText||'').slice(0,800)};
})()
"""
result={"service":SERVICE,"url":URL,"status":"started","emails":[],"domains_from_emails":[],"exposed_domains":[],"evidence":[],"notes":[],"exclude_recommendation":None}
tab=None
try:
 tab=new_tab(URL); wait(2)
 try: wait_for_load(12)
 except Exception: pass
 # Open the domain picker so exposed receiving domains are rendered in the DOM.
 try:
  js("Array.from(document.querySelectorAll('button,[role=\"button\"]')).find(el => /@|\\b[A-Z0-9.-]+\\.[A-Z]{2,}\\b/i.test(el.innerText || el.textContent || ''))?.click()")
 except Exception:
  pass
 data={}
 for _ in range(8):
  wait(2); data=js(EXTRACT_QUERY) or {}
  if data.get('emails') and data.get('exposed_domains'): break
 result['emails']=data.get('emails') or []
 result['domains_from_emails']=sorted({e.split('@',1)[1] for e in result['emails'] if '@' in e})
 result['exposed_domains']=data.get('exposed_domains') or []
 result['evidence']=data.get('evidence') or []
 if data.get('domain_evidence'):
  result['evidence'].extend(data.get('domain_evidence') or [])
 result['url']=data.get('location') or URL
 if result['emails']: result['status']='ok'
 else:
  result['status']='failed'; result['notes'].append('Loaded service but did not find generated email in body/control text.')
except Exception as e:
 result['status']='failed'; result['notes'].append(str(e))
finally:
 if tab:
  try: cdp('Target.closeTarget', targetId=tab)
  except Exception: pass
print(json.dumps(result,indent=2,ensure_ascii=False))
