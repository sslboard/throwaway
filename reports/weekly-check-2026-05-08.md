# Weekly Temp Email Domain Check — 2026-05-08

## Services Tested

| Service | URL | Domains Found | Already Detected? |
|---|---|---|---|
| Guerrilla Mail | guerrillamail.com | sharklasers.com, guerrillamail.info, grr.la, guerrillamail.biz, guerrillamail.com, guerrillamail.de, guerrillamail.net, guerrillamail.org, guerrillamailblock.com, pokemail.net, spam4.me | All 11 detected |
| tempmail.io | tempmail.io | mepost.pw | Detected |
| temp-mail.io | temp-mail.io | gmeenramy.com (sample; 42 total domains) | Detected |
| EmailOnDeck | emailondeck.com | emailondeck.com (captcha prevented domain extraction) | Detected |
| Mailticking | mailticking.com | pdf-cutter.com, rulersonline.com, embassybase.com, mediaholy.com, mediaeast.uk, justdefinition.com, gongjua.com, deepmails.org, swagpapa.com, mailsbay.com, inctart.com, deepyinc.com, 123mails.org, besttempmail.com | 13/14 detected; **embassybase.com missed** |
| Mailwave | mailwave.dev | mailwave.dev, aula.edu.pl, edud.site, globalcampus.edu.pl, hayatsh.com, javaemail.com, radeshop.com, skola.edu.pl, studyhub.edu.pl, volkai.cloud | 2/10 detected (javaemail.com, studyhub.edu.pl); **8 missed** |
| Internxt | internxt.com | (temp email feature uses internxt.com — legitimate broader service) | N/A |

## Domains Added to `scripts/supplemental-domains.txt`

9 new domains added:

1. **embassybase.com** — listed as an email domain on mailticking.com
2. **mailwave.dev** — confirmed disposable by verifymail.io
3. **aula.edu.pl** — mailwave.dev email domain
4. **edud.site** — mailwave.dev email domain
5. **globalcampus.edu.pl** — mailwave.dev email domain
6. **hayatsh.com** — mailwave.dev email domain
7. **radeshop.com** — mailwave.dev email domain
8. **skola.edu.pl** — mailwave.dev email domain
9. **volkai.cloud** — mailwave.dev email domain

## Services Not Fully Tested

- **tempemail.cc** — advertises "hundreds of domains" but the site is JS-rendered; the service domain itself is not detected, but without browser automation the actual email domains couldn't be enumerated
- **mtempmail.com** — JS-rendered; couldn't extract email domains without browser
- **xeramail.com** — JS-rendered; couldn't extract email domains without browser
- **tempforward.com** — appears to be a blog/guide site, not an email provider

## Notes

- Chrome extension was not connected during this run, so all testing was done via the REST API (`/check` endpoint) and static HTML fetching. JS-heavy services that generate domains dynamically couldn't be fully enumerated.
- The mailwave.dev cluster was the largest gap found — 8 new domains from a single service.
- The mailticking.com service had 14 email domains visible in its HTML; only 1 (embassybase.com) was missed by the detector.
- All Guerrilla Mail domains (11 total) are already well-covered.
