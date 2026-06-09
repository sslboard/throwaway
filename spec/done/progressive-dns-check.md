# Progressive DNS Block Check

## Goal

Add a security/protection signal to the email checker while keeping MX validation accurate.

The API should answer four separate questions:

- `valid_tld`: is the suffix real?
- `has_mx`: can the domain receive email?
- `disposable`: is the domain a known disposable provider?
- `dns_blocked`: is an otherwise email-capable domain blocked by Cloudflare filtered DNS?

`should_reject` should be `true` for any of these rejection reasons:

```ts
should_reject = !valid_tld || !has_mx || disposable || dns_blocked;
```

## Resolver choice

Use DNS-over-HTTPS hostnames rather than raw resolver IPs:

- Unfiltered resolver / `1.1.1.1`:
  - `https://cloudflare-dns.com/dns-query`
- Malware/security resolver / `1.1.1.2`:
  - `https://security.cloudflare-dns.com/dns-query`
- Family resolver / `1.1.1.3`:
  - `https://family.cloudflare-dns.com/dns-query`
  - blocks malware and adult content

## Lookup flow

Do not use filtered DNS to determine MX deliverability. Filtered resolvers can suppress answers for policy reasons.

Use this flow:

1. Validate TLD.
   - If invalid, return `has_mx: false`, omit `dns_blocked`, and reject.
2. Query unfiltered DNS for MX.
   - If no MX, return `has_mx: false`, omit `dns_blocked`, and reject.
   - Do not perform filtered-DNS checks when MX is missing; the email is already not deliverable.
3. Query family DNS for A records.
   - If not blocked, return `dns_blocked: false`.
   - If blocked, query security DNS for A records to infer category.
4. If security DNS is also blocked, return `dns_blocked_category: "malware"`.
5. If family DNS is blocked but security DNS is not blocked, return `dns_blocked_category: "family"`.
6. If category cannot be determined, return `dns_blocked_category: "unknown"`.

## API examples

Normal disposable domain:

```json
{
  "domain": "mailinator.com",
  "valid_tld": true,
  "has_mx": true,
  "dns_blocked": false,
  "disposable": true,
  "should_reject": true
}
```

Normal legitimate domain:

```json
{
  "domain": "example.com",
  "valid_tld": true,
  "has_mx": true,
  "dns_blocked": false,
  "disposable": false,
  "should_reject": false
}
```

Filtered-DNS blocked domain:

```json
{
  "domain": "example.test",
  "valid_tld": true,
  "has_mx": true,
  "dns_blocked": true,
  "dns_blocked_category": "malware",
  "disposable": false,
  "should_reject": true
}
```

No-MX domain, with filtered-DNS check skipped:

```json
{
  "domain": "no-mail.example",
  "valid_tld": true,
  "has_mx": false,
  "disposable": false,
  "should_reject": true
}
```

## Block detection

Cloudflare filtered resolvers may signal blocks in different ways. Treat these as blocked:

- DNS `Status === 5`
- DoH `Comment` containing `Filtered`, `Blocked`, or `Censored`
- A record answer of `0.0.0.0`

## Category inference

Cloudflare DoH does not return a rich category field. Category is inferred:

- family blocked + security blocked → `malware`
- family blocked + security not blocked → `family`
- family blocked + security inconclusive → `unknown`

Document this as an inferred Cloudflare resolver-policy category, not an official threat-intelligence verdict.

## Implementation sketch

```ts
type MxResolution = {
  hasMx: boolean;
  dnsBlocked?: boolean;
  dnsBlockedCategory?: "malware" | "family" | "unknown";
};

async function resolveMx(domain: string): Promise<MxResolution> {
  const mx = await queryDns(UNFILTERED_DOH, domain, "MX");
  if (!mx.ok || !mx.hasAnswer) return { hasMx: false };

  const family = await queryDns(FAMILY_DOH, domain, "A");
  if (!family.blocked) return { hasMx: true, dnsBlocked: false };

  const security = await queryDns(SECURITY_DOH, domain, "A");
  const dnsBlockedCategory = security.blocked ? "malware" : security.ok ? "family" : "unknown";
  return { hasMx: true, dnsBlocked: true, dnsBlockedCategory };
}
```

## Tests

Mock `fetch` for deterministic unit tests:

1. Invalid TLD: no DNS checks, `has_mx: false`, omit `dns_blocked`, reject.
2. Unfiltered MX has no answer: omit `dns_blocked`, reject.
3. Unfiltered MX has answer, family A not blocked: `dns_blocked: false`, normal decision.
4. Unfiltered MX has answer, family A blocked, security A blocked: `dns_blocked_category: "malware"`, reject.
5. Unfiltered MX has answer, family A blocked, security A not blocked: `dns_blocked_category: "family"`, reject.
6. Batch email/domain responses match single-check behavior.

Live manual checks:

- `pornhub.com` should normally produce `dns_blocked: true`, `dns_blocked_category: "family"`, and `should_reject: true` if it has MX records.
- Cloudflare test malware domains prove A-record block behavior, but may not have MX records, so they are not good end-to-end tests for an email-domain API unless DNS is mocked.
