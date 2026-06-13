# throwaway

Disposable and invalid email detector hosted at https://throwaway.sslboard.com.

## Public API

- `GET /check?email=user@example.com` checks one email address.
- `GET /check?domain=example.com` checks one domain.
- `POST /check` checks up to 1000 emails or domains in one JSON body.
- `GET /stats` returns bloom-filter metadata.
- `GET /health` returns the package version.

## Agent resources

- `/llms.txt` concise agent instructions.
- `/llms-full.txt` complete agent instructions with discovery links.
- `/auth.md` explicit no-auth policy.
- `/openapi.json` REST API contract.
- `/api-catalog.json` service catalog metadata.
- `/.well-known/mcp-server.json` MCP discovery card.
- `/.well-known/webmcp` WebMCP-compatible discovery metadata.
- `/.well-known/agent-skills.json` agent usage skill manifest.

Use `should_reject` as the coarse accept/reject signal, or inspect `valid_tld`, `has_mx`, `dns_blocked`, and `disposable` for explanation.
