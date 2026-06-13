# Authentication for throwaway

Throwaway has **no authentication**.

- No API key is required.
- No OAuth authorization server is available.
- No protected resources or user-specific data exist.
- CORS is open for browser-based integrations.
- Current request limits: request bodies are capped at 100000 bytes and batch requests are capped at 1000 emails or domains.
- No formal rate limit is currently enforced, but abusive traffic may be blocked or rate-limited in the future.
- High-volume clients are requested to send a descriptive `User-Agent` string with a contact email, for example `ExampleSignupChecker/1.0 (ops@example.com)`. This is requested for operational contact only and is not currently enforced.

Use the public REST API or MCP tools only for email/domain validation and abuse-prevention workflows. The service does not send emails, create accounts, make purchases, or perform authenticated user actions.
