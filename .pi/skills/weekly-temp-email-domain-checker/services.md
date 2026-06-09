# Temp Email Service Inventory

This file tracks services discovered from Google SERPs during weekly temp-email checks, plus adapter/exclusion status.

## Adapter status legend

- `adapter-ok` — deterministic adapter exists and has been verified.
- `adapter-needed` — service appears to be a temp/disposable email generator but no deterministic adapter exists yet.
- `excluded` — host was determined not to be a disposable email generator and should be added to `service-exclusions.json`.
- `unknown` — needs review.

## Services discovered from SERPs

| Host | URL | Status | Notes |
|---|---|---|---|
| `temp-mail.org` | https://temp-mail.org/en/ | adapter-ok | Adapter: `service-adapters/temp-mail-org.py`; reads generated address from `input#mail`. |
| `temp-mail.io` | https://temp-mail.io/en | adapter-ok | Adapter: `service-adapters/temp-mail-io.py`; reads generated address from `input#email`. |
| `internxt.com` | https://internxt.com/temporary-email | adapter-ok | Adapter: `service-adapters/internxt-com.py`; reads generated address from temporary-email widget button text. |
| `tempmailo.com` | https://tempmailo.com/ | adapter-ok | Adapter: `service-adapters/tempmailo-com.py`; reads generated address from `input#i-email`. |
| `emailondeck.com` | https://www.emailondeck.com/ | adapter-ok | Adapter: `service-adapters/emailondeck-com.py`; reports `blocked` because generation is gated by hCaptcha. |
| `tempail.com` | https://tempail.com/ | adapter-ok | Adapter: `service-adapters/tempail-com.py`; reads generated address from `input#eposta_adres`. |
| `guerrillamail.com` | https://www.guerrillamail.com/ | adapter-ok | Adapter: `service-adapters/guerrillamail-com.py`; extracts generated body email and parses `select#gm-host-select` exposed domains. |
| `mail.tm` | https://mail.tm/en/ | adapter-ok | Adapter: `service-adapters/mail-tm.py`; reads generated address from `input#Dont_use_WEB_use_API_OK`. |
| `tempmail.la` | https://tempmail.la/ | adapter-ok | Adapter: `service-adapters/tempmail-la.py`; clicks Create Temp Email and extracts rendered generated address. |
| `temp-inbox.me` | https://temp-inbox.me/ | adapter-ok | Adapter: `service-adapters/temp-inbox-me.py`; extracts inbox link email and parses `select#selected_domain` exposed domains. |
| `disposablemail.com` | https://www.disposablemail.com/ | adapter-ok | Adapter: `service-adapters/disposablemail-com.py`; extracts generated address from rendered page text. |
| `maildrop.cc` | https://maildrop.cc/ | adapter-ok | Adapter: `service-adapters/maildrop-cc.py`; extracts suggested disposable address from rendered page text. |
| `yopmail.com` | https://yopmail.com/en/ | adapter-ok | Adapter: `service-adapters/yopmail-com.py`; uses `/email-generator` and extracts generated address from rendered text. |
| `mails.org` | https://mails.org/ | adapter-ok | Adapter: `service-adapters/mails-org.py`; reads generated address from `input#generatedEmail`. |
| `toolpix.pythonanywhere.com` | https://toolpix.pythonanywhere.com/temp-mail | excluded | Redirected to Trip.com travel booking page, not a temp email generator. Added to `service-exclusions.json`. |
| `10minutemail.com` | https://10minutemail.com/ | adapter-ok | Adapter: `service-adapters/10minutemail-com.py`; reads generated address from `input#mail_address`. |
| `10minutemail.net` | https://10minutemail.net/ | adapter-ok | Adapter: `service-adapters/10minutemail-net.py`; reads generated address from `input#fe_text`. |
| `minuteinbox.com` | https://www.minuteinbox.com/ | adapter-ok | Adapter: `service-adapters/minuteinbox-com.py`; extracts generated address from rendered page text. |
| `10minemail.com` | https://10minemail.com/en/ | adapter-ok | Adapter: `service-adapters/10minemail-com.py`; reads generated address from `input#mail`. |
| `fake-email.pro` | https://fake-email.pro/10-minute-mail | adapter-ok | Adapter: `service-adapters/fake-email-pro.py`; extracts generated email from the address button. |
| `tmailor.com` | https://tmailor.com/th/10-minute-mail | adapter-ok | Adapter: `service-adapters/tmailor-com.py`; reads generated address from `input[name="currentEmailAddress"]`. |
| `scribd.com` | https://www.scribd.com/document/395283787/10-Minute-Mail | excluded | False positive: document/article result, not a temp-mail generator. Added to `service-exclusions.json`. |

## Maintenance notes

- When a new SERP run discovers a service, add or update it here.
- When an adapter is written and verified, mark the service `adapter-ok` and link the adapter path in notes.
- When a host is proven not to be a disposable email generator, mark it `excluded` here and add it to `service-exclusions.json` with evidence.
- Avoid treating generic harvester output as sufficient proof. Use it only as diagnostics while authoring service-specific adapters.
