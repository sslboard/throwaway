# DNS agent discovery runbook

This repository does not currently manage Cloudflare DNS records as code, so DNS-based agent discovery must be configured in the Cloudflare dashboard or whichever DNS IaC system owns `throwaway.sslboard.com`.

## Goal

Expose machine-readable pointers to the same public agent resources served by the Worker:

- `https://throwaway.sslboard.com/llms.txt`
- `https://throwaway.sslboard.com/openapi.json`
- `https://throwaway.sslboard.com/api-catalog.json`
- `https://throwaway.sslboard.com/.well-known/mcp-server.json`

## Proposed TXT records

Verify the current DNS-AID convention before creating these records. If the scanner documents a different owner name or value format, prefer the scanner/spec format over this draft.

| Owner name                      | Type | Draft value                                                      | Purpose                  |
| ------------------------------- | ---- | ---------------------------------------------------------------- | ------------------------ |
| `_agent.throwaway.sslboard.com` | TXT  | `llms=https://throwaway.sslboard.com/llms.txt`                   | Concise LLM instructions |
| `_agent.throwaway.sslboard.com` | TXT  | `openapi=https://throwaway.sslboard.com/openapi.json`            | REST API schema          |
| `_agent.throwaway.sslboard.com` | TXT  | `catalog=https://throwaway.sslboard.com/api-catalog.json`        | API catalog metadata     |
| `_agent.throwaway.sslboard.com` | TXT  | `mcp=https://throwaway.sslboard.com/.well-known/mcp-server.json` | MCP discovery card       |

## Verification

```bash
dig +short TXT _agent.throwaway.sslboard.com
```

Expected output should include each configured URL. Then re-run `https://isitagentready.com/throwaway.sslboard.com` and confirm the DNS discovery check passes.

## Rollback

Remove the TXT records from DNS. The HTTPS discovery endpoints remain available through `robots.txt`, `sitemap.xml`, Link headers, and the homepage `<link>` metadata.
