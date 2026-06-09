# Weekly Temp Email Domain Check — 2026-06-09

## Summary
- Services reviewed: 10 Google first-page temp-email services
- Candidate domains tested: 18 unique domains
- New domains added: 1 (`web-library.net`)
- Local detector base URL: `http://localhost:8787`

## Services tested
| Service | URL | Email/domain harvested | Local detector result | Action |
|---|---|---|---|---|
| Temp Mail | https://temp-mail.org/en/ | `ditel10295@fanchatu.com` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| temp-mail.io | https://temp-mail.io/en | `t9d438spl0@gmeenramy.com` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| Internxt Temp Mail | https://internxt.com/temporary-email | `jry2k@web-library.net` | Initially `disposable: false`, `valid_tld: true`, `has_mx: true`; recheck after rebuild `disposable: true` | Added `web-library.net` |
| Tempmailo | https://tempmailo.com/ | `xibola@denipl.net` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| EmailOnDeck | https://www.emailondeck.com/ | No generated email; clicking Get Email reached captcha step | Not tested | Not fully tested |
| Tempail | https://tempail.com/ | `nidrapukke@necub.com` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| Guerrilla Mail | https://www.guerrillamail.com/ | `xmtrmy+4wpmz1mbhg868@sharklasers.com`; visible domains `guerrillamail.info`, `grr.la`, `guerrillamail.biz`, `guerrillamail.com`, `guerrillamail.de`, `guerrillamail.net`, `guerrillamail.org`, `guerrillamailblock.com`, `pokemail.net`, `spam4.me` | All `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| Mail.tm | https://mail.tm/en/ | `rochetteemerald@web-library.net` | Initially `disposable: false`, `valid_tld: true`, `has_mx: true`; recheck after rebuild `disposable: true` | Added `web-library.net` |
| tempmail.la | https://tempmail.la/ | `radiator4782810345@lovecalculatorname.org` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |
| temp-inbox | https://temp-inbox.me/ | `gretaltbtn@instantbox.live` | `disposable: true`, `valid_tld: true`, `has_mx: true` | Already covered |

## Domains added to `scripts/supplemental-domains.txt`
- `web-library.net` — generated live by Internxt Temp Mail (`jry2k@web-library.net`) and Mail.tm (`rochetteemerald@web-library.net`); local detector returned `disposable: false` before adding.

## Already covered
- `fanchatu.com` — Temp Mail
- `gmeenramy.com` — temp-mail.io
- `denipl.net` — Tempmailo
- `necub.com` — Tempail
- `sharklasers.com` — Guerrilla Mail
- `guerrillamail.info`, `grr.la`, `guerrillamail.biz`, `guerrillamail.com`, `guerrillamail.de`, `guerrillamail.net`, `guerrillamail.org`, `guerrillamailblock.com`, `pokemail.net`, `spam4.me` — Guerrilla Mail visible domain list
- `lovecalculatorname.org` — tempmail.la
- `instantbox.live` — temp-inbox

## Services not fully tested
- EmailOnDeck — clicking Get Email navigated to `?act=recap` and displayed `Invalid captcha, step 1 failed`; no CAPTCHA bypass attempted.

## Validation
- `npm run build:filter`: pass. Initial refresh loaded 46 supplemental domains and removed 4 upstream duplicates (`brixozu.com`, `fanchatu.com`, `fixscal.com`, `dosbee.com`), producing 73,440 items. Final rebuild after adding `web-library.net` loaded 43 supplemental domains and produced 73,441 items.
- `npm test`: pass — 2 test files, 45 tests passed.
- Recheck newly added domains: pass — `jry2k@web-library.net` and `rochetteemerald@web-library.net` both returned `disposable: true` locally after rebuild.

## Notes
- Browser harvesting used new tabs via `browser-harness` and tested against local `wrangler dev` at `http://localhost:8787`.
- No production API calls were used for detector validation.
- The working tree already contained uncommitted 2026-06-09 supplemental additions before this browser-harvest run: `xbsees.com`, `retreze.com`, `mistark.com`, `brixozu.com`, `fanchatu.com`, `tixpad.com`, `xemtop.com`, `fixscal.com`, `snocv.com`, `dosbee.com`, `lulujewels.shop`, `damzfa.id`, and `minhminclone.io.vn`. The filter refresh removed the four now-upstream duplicates listed above.
