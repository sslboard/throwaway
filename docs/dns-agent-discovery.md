# DNS agent discovery runbook

This repository does not currently manage Cloudflare DNS records as code, so DNS-based agent discovery must be configured in the Cloudflare dashboard or whichever DNS IaC system owns `throwaway.sslboard.com`.

## Goal

Expose machine-readable pointers to the same public agent resources served by the Worker, using the [DNS for AI Discovery (DNS-AID)](https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md) convention.

Agent resources:

- `https://throwaway.sslboard.com/llms.txt`
- `https://throwaway.sslboard.com/openapi.json`
- `https://throwaway.sslboard.com/api-catalog.json`
- `https://throwaway.sslboard.com/.well-known/mcp-server.json`

## Records

### HTTPS service records (SVCB type 65)

Per the DNS-AID spec, the scanner looks for `HTTPS` records under `_agents` (plural) subdomains of the target domain.

| Owner name                                    | Type   | Priority | Target                         | Value params |
| --------------------------------------------- | ------ | -------- | ------------------------------ | ------------ |
| `_index._agents.throwaway.sslboard.com`       | HTTPS  | 1        | `throwaway.sslboard.com.`      | `alpn=h2`   |
| `_mcp._agents.throwaway.sslboard.com`         | HTTPS  | 1        | `throwaway.sslboard.com.`      | `alpn=h2`   |
| `_a2a._agents.throwaway.sslboard.com`         | HTTPS  | 1        | `throwaway.sslboard.com.`      | `alpn=h2`   |

### TXT index record

A single TXT record on `_index._agents` carries a human-readable manifest of all agent endpoints:

| Owner name                                    | Type | Value                                                                                                                                                           |
| --------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_index._agents.throwaway.sslboard.com`       | TXT  | `v=dnsaid1; llms=https://throwaway.sslboard.com/llms.txt; openapi=https://throwaway.sslboard.com/openapi.json; catalog=https://throwaway.sslboard.com/api-catalog.json; mcp=https://throwaway.sslboard.com/.well-known/mcp-server.json` |

## Verification

### DoH (authoritative)

```bash
# HTTPS records — dig doesn't display type 65 natively; use DoH:
curl -sH 'Accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=_index._agents.throwaway.sslboard.com&type=HTTPS' | jq '.Answer[].data'

# TXT index record
curl -sH 'Accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=_index._agents.throwaway.sslboard.com&type=TXT' | jq '.Answer[].data'
```

### isitagentready.com scanner

```bash
curl -s -X POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://throwaway.sslboard.com"}' | jq '.checks.discoverability.dnsAid.status'
# Expected: "pass"
```

### Automated test

```bash
npx vitest run src/dns-discovery.test.ts
```

## Rollback

Remove the HTTPS and TXT records from DNS. The HTTPS discovery endpoints remain available through `robots.txt`, `sitemap.xml`, Link headers, and the homepage `<link>` metadata.
