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
| `yopmail.com` | https://yopmail.com/en/ | adapter-ok | Adapter: `service-adapters/yopmail-com.py`; forces `/email-generator` when the SERP queue URL is `/en/` and extracts generated address from `#egen`/`#geny`. Fixed and verified 2026-06-09; generated `nocrikoureiro-3376@yopmail.com`. |
| `mails.org` | https://mails.org/ | adapter-ok | Adapter: `service-adapters/mails-org.py`; reads generated address from `input#generatedEmail`. Verified 2026-06-09; generated `devon.j@cometclear.com`. 2026-06-16 run hit CAPTCHA after clicking generate. |
| `emailtemp.org` | https://emailtemp.org/en | adapter-ok | Adapter: `service-adapters/emailtemp-org.py`; reads generated address from `input#trsh_mail`. Verified 2026-06-16; generated `hithxnd966@tormails.com` (already covered). |
| `mailporary.com` | https://mailporary.com/10minutemail | adapter-ok | Adapter: `service-adapters/mailporary-com.py`; reads generated address from the visible email input. Verified 2026-06-16; generated `kamvuahp8p@disefl.com` (already covered). |
| `tempmailg.com` | https://tempmailg.com/en | adapter-ok | Adapter: `service-adapters/tempmailg-com.py`; reads generated address from `input#mainEmail` and parses `#name_domain option` values. Verified 2026-06-16; generated `kxi10@nondon.site`; exposed domains: `vsmailpro.live`, `jazzvip.site`, `oegmail.store`, `boommail.online`, `babyfun.fun`, `speedlooking.fun`, `flashemail.site`, `nondon.site`, `ingam.online`. |
| `throwaway-email.temp-mail-world.com` | https://throwaway-email.temp-mail-world.com/en/ | adapter-ok | Adapter: `service-adapters/throwaway-email-temp-mail-world-com.py`; reads generated address from `input#mainEmail` and parses `#name_domain option` values. Verified 2026-06-16; generated `kkb56@10-minutes.email`; exposed domain: `10-minutes.email`. |
| `temp-email.io` | https://temp-email.io/ | adapter-ok | Adapter: `service-adapters/temp-email-io.py`; reads generated address from `input#mainEmail`. Verified 2026-06-09; generated `rqi05@mroxis.com`. |
| `deepweb.net` | https://deepweb.net/temp-email | adapter-ok | Adapter: `service-adapters/deepweb-net.py`; combines rendered local-part input with `@deep-mail.org`. Verified 2026-06-09; generated `tamia.cole@deep-mail.org`. |
| `tempgbox.net` | https://tempgbox.net/ | adapter-ok | Adapter: `service-adapters/tempgbox-net.py`; dismisses cookie prompt if present, clicks Generate, and extracts rendered address. Verified 2026-06-09; generated `marryjems12421+4tlejg6798@googlemail.com`. |
| `temporarymail.com` | https://temporarymail.com/en/ | adapter-ok | Adapter: `service-adapters/temporarymail-com.py`; reads generated address from `input#emailAddress` and enumerates exact `#selectedDomain option` values. Verified 2026-06-09; generated `velcie.clinkscales@horizonspost.com`; exposed domains: `allfreemail.net`, `allwebemails.com`, `easymailer.live`, `horizonspost.com`, `inboxorigin.com`, `mailmagnet.co`, `mycreativeinbox.com`, `openmail.pro`, `solarnyx.com`. |
| `zenvex.dev` | https://zenvex.dev/ | adapter-ok | Adapter: `service-adapters/zenvex-dev.py`; extracts generated address from rendered body/control text and opens `.domain-trigger` to enumerate `[role="option"]` domains. Verified 2026-06-09; generated `yc61dvb@ensam.edu.pl`; exposed domains: `encg.edu.pl`, `ensam.edu.pl`, `ofppt.edu.pl`, `zenvex.edu.pl`, `znvx.me`. |
| `amazon.com` | https://www.amazon.com/Temp-Mail-Temporary-Disposable-Email/dp/B08JQQF2H7 | unknown | Discovered 2026-06-09 SERP queue; likely app-store/listing result, needs exclusion review. |
| `bluestacks.com` | https://www.bluestacks.com/apps/communication/temp-mail-temporary-email-on-pc.html | unknown | Discovered 2026-06-09 SERP queue; likely app/software listing result, needs exclusion review. |
| `pcmag.com` | https://www.pcmag.com/picks/the-best-temporary-email-services | unknown | Discovered 2026-06-09 SERP queue; likely article/review result, needs exclusion review. |
| `privacyinternational.org` | https://privacyinternational.org/guide-step/5534/guide-making-use-disposable-email-addresses | unknown | Discovered 2026-06-09 SERP queue; likely guide/article result, needs exclusion review. |
| `linkedin.com` | https://www.linkedin.com/posts/davidbombal_privacy-email-proton-activity-7385057030614568960-FmFQ | unknown | Discovered 2026-06-09 SERP queue; likely social post, needs exclusion review. |
| `dwanethomas.com` | https://dwanethomas.com/tip-of-the-week-296-how-to-create-a-throwaway-email-account/ | unknown | Discovered 2026-06-09 SERP queue; likely article result, needs exclusion review. |
| `toolpix.pythonanywhere.com` | https://toolpix.pythonanywhere.com/temp-mail | excluded | Redirected to Trip.com travel booking page, not a temp email generator. Added to `service-exclusions.json`. |
| `10minutemail.com` | https://10minutemail.com/ | adapter-ok | Adapter: `service-adapters/10minutemail-com.py`; reads generated address from `input#mail_address`. |
| `10minutemail.net` | https://10minutemail.net/ | adapter-ok | Adapter: `service-adapters/10minutemail-net.py`; reads generated address from `input#fe_text`. |
| `minuteinbox.com` | https://www.minuteinbox.com/ | adapter-ok | Adapter: `service-adapters/minuteinbox-com.py`; extracts generated address from rendered page text. |
| `10minemail.com` | https://10minemail.com/en/ | adapter-ok | Adapter: `service-adapters/10minemail-com.py`; reads generated address from `input#mail`. |
| `fake-email.pro` | https://fake-email.pro/10-minute-mail | adapter-ok | Adapter: `service-adapters/fake-email-pro.py`; extracts generated email from the address button. Verified 2026-06-09; generated `averiewalsh.0@quiet-branch.com`. |
| `tmailor.com` | https://tmailor.com/th/10-minute-mail | adapter-ok | Adapter: `service-adapters/tmailor-com.py`; reads generated address from `input[name="currentEmailAddress"]`. |
| `scribd.com` | https://www.scribd.com/document/395283787/10-Minute-Mail | excluded | False positive: document/article result, not a temp-mail generator. Added to `service-exclusions.json`. |
| `lroid.com` | https://lroid.com/ | adapter-ok | Adapter: `service-adapters/lroid-com.py`; extracts generated address from rendered page text. Verified 2026-06-23; generated `holtaher@yevme.com` (already covered; `has_mx: false` anomaly). |
| `tempmail.so` | https://tempmail.so/ | adapter-ok | Adapter: `service-adapters/tempmail-so.py`; reads generated address from `span.text-base.truncate` (no exposed domain dropdown). Verified 2026-06-23; generated `booby89464220@aminating.com` (already covered). |

## Maintenance notes

- When a new SERP run discovers a service, add or update it here.
- When an adapter is written and verified, mark the service `adapter-ok` and link the adapter path in notes.
- When a host is proven not to be a disposable email generator, mark it `excluded` here and add it to `service-exclusions.json` with evidence.
- Avoid treating generic harvester output as sufficient proof. Use it only as diagnostics while authoring service-specific adapters.
