---
name: throwaway-email-validation
description: Validate whether emails or domains should be rejected as invalid, non-deliverable, filtered-DNS blocked, or disposable.
---

# throwaway email validation

Use this skill when deciding whether a signup, lead, or abuse-prevention workflow should reject an email address or domain.

## Tools

- REST: `GET https://throwaway.sslboard.com/check?email=user@example.com`
- REST: `GET https://throwaway.sslboard.com/check?domain=example.com`
- REST: `POST https://throwaway.sslboard.com/check`
- MCP: `https://throwaway.sslboard.com/mcp` with `check_email`, `check_domain`, `batch_check_emails`, `batch_check_domains`, and `get_stats`

## Decision policy

Use `should_reject` as the coarse accept/reject signal. Inspect `valid_tld`, `has_mx`, `dns_blocked`, and `disposable` when you need an explanation. Do not treat `disposable=true` as proof of malicious intent.

## Privacy

Avoid logging full email addresses unless your application requires it. Prefer checking bare domains when user-level identity is not needed.
