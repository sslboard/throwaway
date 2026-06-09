"""Deterministic browser-harness adapter for temporarymail.com."""
import json, os
SERVICE="temporarymail.com"
URL=os.environ.get("SERVICE_URL","https://temporarymail.com/en/")
EXTRACT_QUERY=r"""
(() => {
 const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
 const sources=[]; const add=(kind,value,selector)=>{const text=String(value||'').replace(/\s+/g,' ').trim(); if(text) sources.push({kind,value:text,selector});};
 const email=document.querySelector('input#emailAddress,[aria-label="Your temporary email address"]');
 if(email) add('generated-email-input', email.value || email.getAttribute('value'), email.id ? '#'+email.id : '[aria-label="Your temporary email address"]');
 const domains=[];
 const selected=document.querySelector('#selectedDomain');
 const domainEvidence=[];
 if(selected) {
   add('domain-selector', selected.innerText || selected.textContent || '', '#selectedDomain');
   for (const option of Array.from(selected.querySelectorAll('option'))) {
     const value = option.value || option.innerText || option.textContent || '';
     const match = String(value).match(/@?([A-Z0-9.-]+\.[A-Z]{2,})/i);
     if (match) {
       domains.push(match[1].toLowerCase());
       domainEvidence.push({kind:'domain-option', value: option.innerText || option.textContent || option.value, selector:'#selectedDomain option'});
     }
   }
 }
 for (const el of Array.from(document.querySelectorAll('input,textarea,button,[data-clipboard-text],[aria-label],[title]')).slice(0,100)) add('control',[el.value,el.innerText,el.getAttribute('data-clipboard-text'),el.getAttribute('aria-label'),el.getAttribute('title')].filter(Boolean).join(' '),el.id?'#'+el.id:el.tagName.toLowerCase());
 const emails=[...new Set((email ? String(email.value || email.getAttribute('value') || '').match(EMAIL_RE) || [] : []).map(e=>e.toLowerCase()))];
 return {location:location.href,title:document.title,emails,exposed_domains:[...new Set(domains)],evidence:sources.filter(s=>EMAIL_RE.test(s.value)).slice(0,10),domain_evidence:domainEvidence.slice(0,20),text:(document.body?.innerText||'').slice(0,800)};
})()
"""
result={"service":SERVICE,"url":URL,"status":"started","emails":[],"domains_from_emails":[],"exposed_domains":[],"evidence":[],"notes":[],"exclude_recommendation":None}
tab=None
try:
 tab=new_tab(URL); wait(2)
 try: wait_for_load(12)
 except Exception: pass
 data={}
 for _ in range(8):
  wait(2); data=js(EXTRACT_QUERY) or {}
  if data.get('emails'): break
 result['emails']=data.get('emails') or []
 result['domains_from_emails']=sorted({e.split('@',1)[1] for e in result['emails'] if '@' in e})
 result['exposed_domains']=data.get('exposed_domains') or []
 result['evidence']=data.get('evidence') or []
 if data.get('domain_evidence'):
  result['evidence'].extend(data.get('domain_evidence') or [])
 result['url']=data.get('location') or URL
 if result['emails']: result['status']='ok'
 else:
  result['status']='failed'; result['notes'].append('Loaded service but did not find generated address in #emailAddress.')
except Exception as e:
 result['status']='failed'; result['notes'].append(str(e))
finally:
 if tab:
  try: cdp('Target.closeTarget', targetId=tab)
  except Exception: pass
print(json.dumps(result,indent=2,ensure_ascii=False))
