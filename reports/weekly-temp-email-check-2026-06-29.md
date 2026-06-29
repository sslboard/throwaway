# Weekly Temp Email Domain Check — 2026-06-29

## Summary
- Services reviewed: 26 from `/tmp/throwaway-serp-services.json`
- Candidate domains tested: 22
- New domains added: 4 (`dropoffs.org`, `tg.gardianwaves.org`, `sorawatermarkadder.org`, `skatingion.com`)
- Local detector base URL: `http://localhost:8787`

## Services tested
| Service | URL | Email/domain harvested | Local detector result | Action |
|---|---|---|---|---|
| temp-mail.org | https://temp-mail.org/en/ | `dawiga8384@jctoto.com` | covered | none |
| temp-mail.io | https://temp-mail.io/en | `jfazytwkqy@ozsaip.com` | covered | none |
| internxt.com | https://internxt.com/temporary-email | `f2xvs@web-library.net` | covered | none |
| tempail.com | https://tempail.com/ | `celtokolmu@necub.com` | covered | none |
| tempmailo.com | https://tempmailo.com/ | `ruhocuxi@denipl.net` | covered | none |
| tmailor.com | https://tmailor.com/ | `m1ngpuxx@contaco.org` | covered | none |
| mail.tm | https://mail.tm/en/ | `shereecondemned@web-library.net` | covered | none |
| tempmail.la | https://tempmail.la/ | `jules02733525248@deshnetarchadacalculator.one`; dropdown domains included `deshnetarchadacalculator.one`, `gagcalculator.me`, `compressjpg.io`, `pinkgreengenerator.me`, `aiphotoenhancer.me`, `lovecalculatorname.org`, `whitehousecalculator.com`, `sorawatermarkadder.org`, `wplacetools.com` | one exposed domain missed, then covered after rebuild | added `sorawatermarkadder.org` |
| emailondeck.com | https://www.emailondeck.com/ | `yohanna45@skatingion.com` from manual user check | missed, then covered after rebuild | added `skatingion.com` |
| mails.org | https://mails.org/ | `charlieu@beaconwarp.com` | covered | none |
| disposablemail.com | https://www.disposablemail.com/ | `aristotle.advik@dropoffs.org` | missed, then covered after rebuild | added `dropoffs.org` |
| xeramail.com | https://xeramail.com/ | `fabulous.oasis902@phuturemail.com` | covered | added adapter |
| facebook.com | queued SERP URL | none | not a generator | excluded `facebook.com` |
| fake-email.pro | https://fake-email.pro/ | `sierra.boyle.8259@radiant-flow.org` | covered | none |
| maildrop.cc | https://maildrop.cc/ | `terrible.ape8084@maildrop.cc` | covered | none |
| yopmail.com | https://yopmail.com/en/ | `nocrikoureiro-3376@yopmail.com` | covered | none |
| tempmaillab.com | https://tempmaillab.com/ | `3ie81hhn@chatgptmail.shop` | covered | added adapter |
| temporarymail.com | https://temporarymail.com/en/ | `velcie.clinkscales@horizonspost.com` | covered | none |
| tempmail.lol | https://tempmail.lol/en/ | `manlove293f1e@tg.gardianwaves.org` | missed, then covered after rebuild | added adapter + `tg.gardianwaves.org` |
| guerrillamail.com | https://www.guerrillamail.com/ | `xs0t6m+3s5jtsfx2r6js@sharklasers.com` | covered | none |
| throwaway-email.temp-mail-world.com | https://throwaway-email.temp-mail-world.com/en/ | `uwk69@10-minutes.email` | covered | none |
| 10minutemail.com | https://10minutemail.com/ | `ohcvwlbtdunlrcjpjw@vtmpj.net` | covered | none |
| 10minutemail.net | https://10minutemail.net/ | `iuz37052@laoia.com` | covered | none |
| minuteinbox.com | https://www.minuteinbox.com/ | `kenzel.brantley@minafter.com` | covered | none |
| 10minemail.com | https://10minemail.com/en/ | `yepace1083@adsprite.com` | covered | none |
| mailporary.com | https://mailporary.com/ | `naeviiueci@vbgvd.com` | covered | none |

## Domains added to `scripts/supplemental-domains.txt`
- `dropoffs.org` — disposablemail.com generated `aristotle.advik@dropoffs.org`
- `tg.gardianwaves.org` — tempmail.lol generated `manlove293f1e@tg.gardianwaves.org`
- `sorawatermarkadder.org` — tempmail.la exposed it in the selectable temp-mail domain dropdown
- `skatingion.com` — emailondeck.com generated `yohanna45@skatingion.com` during manual user check

## Already covered
- `10-minutes.email`, `adsprite.com`, `aiphotoenhancer.me`, `beaconwarp.com`, `chatgptmail.shop`, `compressjpg.io`, `contaco.org`, `denipl.net`, `deshnetarchadacalculator.one`, `gagcalculator.me`, `horizonspost.com`, `jctoto.com`, `laoia.com`, `lovecalculatorname.org`, `maildrop.cc`, `minafter.com`, `necub.com`, `ozsaip.com`, `phuturemail.com`, `pinkgreengenerator.me`, `radiant-flow.org`, `sharklasers.com`, `vbgvd.com`, `vtmpj.net`, `web-library.net`, `whitehousecalculator.com`, `wplacetools.com`, `yopmail.com`

## Services not fully tested

## Validation
- `npm run build:filter`: pass; item count changed from 74,359 to 74,363 after additions.
- `npm test`: pass, 56 tests across 3 files.
- Recheck newly added domains: pass; all return `disposable: true`, `valid_tld: true`, `has_mx: true` locally.

## Notes
- Upstream duplicate pruning removed 8 supplemental domains: `cometclear.com`, `aratrin.com`, `babyfun.fun`, `boommail.online`, `flashemail.site`, `ingam.online`, `nondon.site`, `speedlooking.fun`.
- Added deterministic adapters for `xeramail.com`, `tempmaillab.com`, `tempmail.lol`, and a `facebook.com` false-positive exclusion adapter.
- Added `facebook.com` to `service-exclusions.json`.
