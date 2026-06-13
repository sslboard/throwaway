# Auth.md

## Authentication for throwaway

Throwaway has **no authentication**.

- No API key is required.
- No OAuth authorization server is available.
- No protected resources or user-specific data exist.
- CORS is open for browser-based integrations.
- Current request limits: request bodies are capped at 100000 bytes and batch requests are capped at 1000 emails or domains.
- No formal rate limit is currently enforced, but abusive traffic may be blocked or rate-limited in the future.
- High-volume clients are requested to send a descriptive `User-Agent` string with a contact email, for example `ExampleSignupChecker/1.0 (ops@example.com)`. This is requested for operational contact only and is not currently enforced.

## Agent audience

This document is for AI agents, API clients, browser tools, and automation systems that need to validate email addresses or domains.

## Agent registration

Agent registration is not required.

- Registration endpoint: none.
- Provisioning endpoint: none.
- Approval flow: none.
- Register URI: not applicable.

Agents can call the public REST API, MCP endpoint, and WebMCP tools without creating a client, obtaining credentials, or completing an approval flow.

```yaml
agent_auth:
  skill: anonymous-public-api
  register_uri: none
  identity_types_supported:
    - anonymous
  registration_methods:
    - type: anonymous
      description: No registration, provisioning, credential issuance, or approval is required.
  anonymous:
    credential_types_supported:
      - none
    claim_uri: https://throwaway.sslboard.com/auth.md
```

## Supported methods

- Anonymous public access over HTTPS.
- REST JSON API at `/check`, `/stats`, and `/health`.
- MCP JSON-RPC endpoint at `/mcp`.
- WebMCP browser tool registration on the homepage.

## Credential use

No bearer token, API key, OAuth client credential, cookie, signature, or agent credential is issued or accepted.

Use the public REST API or MCP tools only for email/domain validation and abuse-prevention workflows. The service does not send emails, create accounts, make purchases, or perform authenticated user actions.
