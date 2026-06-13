import { version } from "../package.json";
import { BASE_URL } from "./http";
import llmsTxt from "./llms.txt";
import { MAX_BATCH_SIZE, MAX_BODY_SIZE } from "./email-check";

const json = (value: unknown) => JSON.stringify(value, null, 2);

export const ROBOTS_TXT = `# throwaway allows crawlers and interactive agents to discover public docs and use the public API at reasonable volume.
User-agent: *
Allow: /
Allow: /check
Allow: /stats
Allow: /health
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /auth.md
Allow: /openapi.json
Allow: /api-catalog.json
Allow: /.well-known/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

LLMS: ${BASE_URL}/llms.txt
Sitemap: ${BASE_URL}/sitemap.xml
Host: throwaway.sslboard.com
`;

const sitemapUrls = [
	"/",
	"/llms.txt",
	"/llms-full.txt",
	"/auth.md",
	"/openapi.json",
	"/api-catalog.json",
	"/.well-known/mcp-server.json",
	"/.well-known/agent-skills.json",
	"/.well-known/agent-card.json",
];

export const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
	.map(
		(path) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === "/" ? "1.0" : "0.7"}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>
`;

export const AUTH_MD = `# Authentication for throwaway

Throwaway has **no authentication**.

- No API key is required.
- No OAuth authorization server is available.
- No protected resources or user-specific data exist.
- CORS is open for browser-based integrations.
- Current request limits: request bodies are capped at ${MAX_BODY_SIZE} bytes and batch requests are capped at ${MAX_BATCH_SIZE} emails or domains.
- No formal rate limit is currently enforced, but abusive traffic may be blocked or rate-limited in the future.

Use the public REST API or MCP tools only for email/domain validation and abuse-prevention workflows. The service does not send emails, create accounts, make purchases, or perform authenticated user actions.
`;

export const HOME_MARKDOWN = `# throwaway

Disposable and invalid email detector hosted at ${BASE_URL}.

## Public API

- \`GET /check?email=user@example.com\` checks one email address.
- \`GET /check?domain=example.com\` checks one domain.
- \`POST /check\` checks up to ${MAX_BATCH_SIZE} emails or domains in one JSON body.
- \`GET /stats\` returns bloom-filter metadata.
- \`GET /health\` returns the package version.

## Agent resources

- \`/llms.txt\` concise agent instructions.
- \`/llms-full.txt\` complete agent instructions with discovery links.
- \`/auth.md\` explicit no-auth policy.
- \`/openapi.json\` REST API contract.
- \`/api-catalog.json\` service catalog metadata.
- \`/.well-known/mcp-server.json\` MCP discovery card.
- \`/.well-known/agent-skills.json\` agent usage skill manifest.

Use \`should_reject\` as the coarse accept/reject signal, or inspect \`valid_tld\`, \`has_mx\`, \`dns_blocked\`, and \`disposable\` for explanation.
`;

export const LLMS_FULL_TXT = `${llmsTxt}

## Agent discovery resources

- Homepage markdown: ${BASE_URL}/?format=markdown or \`Accept: text/markdown\`.
- Authentication policy: ${BASE_URL}/auth.md (no auth, no OAuth, no commerce).
- OpenAPI: ${BASE_URL}/openapi.json.
- API catalog: ${BASE_URL}/api-catalog.json.
- MCP server card: ${BASE_URL}/.well-known/mcp-server.json.
- MCP endpoint: ${BASE_URL}/mcp.
- Agent skills: ${BASE_URL}/.well-known/agent-skills.json.
- Agent card: ${BASE_URL}/.well-known/agent-card.json.
- Sitemap: ${BASE_URL}/sitemap.xml.
- Robots policy: ${BASE_URL}/robots.txt.

## Limits and safety

No API key is required. Request bodies are capped at ${MAX_BODY_SIZE} bytes and batch requests are capped at ${MAX_BATCH_SIZE} emails or domains. Disposable email detection is an abuse-prevention signal, not proof of malicious intent.
`;

export const OPENAPI = {
	openapi: "3.1.0",
	info: {
		title: "throwaway API",
		version,
		description: "Public no-auth API for disposable email, TLD, MX, and filtered-DNS checks.",
		license: { name: "MIT" },
	},
	servers: [{ url: BASE_URL }],
	security: [],
	paths: {
		"/check": {
			get: {
				summary: "Check one email address or domain",
				parameters: [
					{ name: "email", in: "query", schema: { type: "string", format: "email" } },
					{ name: "domain", in: "query", schema: { type: "string" } },
				],
				responses: {
					"200": {
						description: "Check result",
						content: {
							"application/json": { schema: { $ref: "#/components/schemas/CheckResult" } },
						},
					},
					"400": { $ref: "#/components/responses/Error" },
					"405": { $ref: "#/components/responses/Error" },
				},
			},
			post: {
				summary: "Batch-check emails or domains",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								oneOf: [
									{ $ref: "#/components/schemas/BatchEmailsRequest" },
									{ $ref: "#/components/schemas/BatchDomainsRequest" },
								],
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Batch check results",
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["results"],
									properties: {
										results: { type: "array", items: { $ref: "#/components/schemas/CheckResult" } },
									},
								},
							},
						},
					},
					"400": { $ref: "#/components/responses/Error" },
					"413": { $ref: "#/components/responses/Error" },
					"405": { $ref: "#/components/responses/Error" },
				},
			},
		},
		"/stats": {
			get: {
				summary: "Return bloom-filter metadata",
				responses: {
					"200": {
						description: "Filter stats",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Stats" } } },
					},
					"405": { $ref: "#/components/responses/Error" },
				},
			},
		},
		"/health": {
			get: {
				summary: "Return service version",
				responses: {
					"200": {
						description: "Health result",
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["version"],
									properties: { version: { type: "string" } },
								},
							},
						},
					},
					"405": { $ref: "#/components/responses/Error" },
				},
			},
		},
	},
	components: {
		responses: {
			Error: {
				description: "Error",
				content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			},
		},
		schemas: {
			CheckResult: {
				type: "object",
				required: ["domain", "valid_tld", "has_mx", "disposable", "should_reject"],
				properties: {
					email: { type: "string" },
					domain: { type: "string" },
					valid_tld: { type: "boolean" },
					has_mx: { type: "boolean" },
					dns_blocked: { type: "boolean" },
					dns_blocked_category: { type: "string", enum: ["malware", "family", "unknown"] },
					disposable: { type: "boolean" },
					should_reject: { type: "boolean" },
				},
			},
			BatchEmailsRequest: {
				type: "object",
				required: ["emails"],
				properties: {
					emails: {
						type: "array",
						maxItems: MAX_BATCH_SIZE,
						items: { type: "string", format: "email" },
					},
				},
			},
			BatchDomainsRequest: {
				type: "object",
				required: ["domains"],
				properties: {
					domains: { type: "array", maxItems: MAX_BATCH_SIZE, items: { type: "string" } },
				},
			},
			Stats: {
				type: "object",
				required: ["itemCount", "bitCount", "hashCount", "byteSize", "falsePositiveRate"],
				properties: {
					itemCount: { type: "integer" },
					bitCount: { type: "integer" },
					hashCount: { type: "integer" },
					byteSize: { type: "integer" },
					falsePositiveRate: { type: "number" },
				},
			},
			Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } },
		},
	},
};

export const API_CATALOG = {
	name: "throwaway",
	description: "Disposable and invalid email detection API.",
	url: BASE_URL,
	version,
	authentication: "none",
	openapi: `${BASE_URL}/openapi.json`,
	documentation: `${BASE_URL}/llms-full.txt`,
	authenticationDocumentation: `${BASE_URL}/auth.md`,
	mcpServer: `${BASE_URL}/.well-known/mcp-server.json`,
	license: "MIT",
	provider: { name: "SSLBoard", url: "https://sslboard.com" },
};

export const MCP_SERVER_CARD = {
	name: "throwaway",
	description: "Read-only disposable email/domain validation tools.",
	url: BASE_URL,
	transport: { type: "streamable-http", url: `${BASE_URL}/mcp` },
	authentication: { type: "none", documentation: `${BASE_URL}/auth.md` },
	tools: ["check_email", "check_domain", "batch_check_emails", "batch_check_domains", "get_stats"],
};

export const AGENT_SKILLS = {
	name: "throwaway-email-validation",
	description:
		"Validate whether emails or domains should be rejected as invalid, non-deliverable, filtered-DNS blocked, or disposable.",
	api: `${BASE_URL}/openapi.json`,
	mcp: `${BASE_URL}/.well-known/mcp-server.json`,
	guidance: [
		"Call check_email for a signup email address.",
		"Use should_reject as the coarse gate.",
		"Inspect valid_tld, has_mx, dns_blocked, and disposable for explanations.",
		"Do not treat disposable=true as proof of malicious intent.",
		"Avoid logging full email addresses unless your application requires it.",
	],
};

export const AGENT_CARD = {
	name: "throwaway",
	description:
		"Stateless validation agent for disposable email, invalid TLD, MX, and filtered-DNS signals.",
	provider: { organization: "SSLBoard", url: "https://sslboard.com" },
	url: BASE_URL,
	capabilities: ["email_validation", "domain_validation", "batch_validation"],
	authentication: "none",
	endpoints: { rest: `${BASE_URL}/openapi.json`, mcp: `${BASE_URL}/mcp` },
};

export function jsonArtifact(value: unknown): string {
	return json(value);
}
