import { version } from "../package.json";
import { BASE_URL } from "./http";
import { MAX_BATCH_SIZE } from "./limits";

const json = (value: unknown) => JSON.stringify(value, null, 2);

const sitemapUrls = [
	"/",
	"/llms.txt",
	"/llms-full.txt",
	"/auth.md",
	"/openapi.json",
	"/api-catalog.json",
	"/.well-known/api-catalog",
	"/.well-known/mcp-server.json",
	"/.well-known/mcp/server-card.json",
	"/.well-known/webmcp",
	"/.well-known/agent-skills.json",
	"/.well-known/agent-skills/index.json",
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
	webMcp: `${BASE_URL}/.well-known/webmcp`,
	license: "MIT",
	provider: { name: "SSLBoard", url: "https://sslboard.com" },
};

export const API_CATALOG_LINKSET = {
	linkset: [
		{
			anchor: `${BASE_URL}/`,
			"service-desc": [{ href: `${BASE_URL}/openapi.json`, type: "application/openapi+json" }],
			"service-doc": [{ href: `${BASE_URL}/llms-full.txt`, type: "text/plain" }],
			status: [{ href: `${BASE_URL}/health`, type: "application/json" }],
			"service-meta": [{ href: `${BASE_URL}/api-catalog.json`, type: "application/json" }],
		},
	],
};

export const MCP_SERVER_CARD = {
	name: "throwaway",
	description: "Read-only disposable email/domain validation tools.",
	url: BASE_URL,
	serverInfo: { name: "throwaway", version },
	transport: { type: "streamable-http", url: `${BASE_URL}/mcp` },
	authentication: { type: "none", documentation: `${BASE_URL}/auth.md` },
	capabilities: {
		tools: { listChanged: false },
		resources: {},
		prompts: {},
	},
	tools: ["check_email", "check_domain", "batch_check_emails", "batch_check_domains", "get_stats"],
};

export const WEBMCP_MANIFEST = {
	name: "throwaway",
	description:
		"Web discovery metadata for throwaway validation tools. Browser WebMCP support is experimental; headless agents should use the REST OpenAPI contract or MCP endpoint.",
	url: BASE_URL,
	openapi: `${BASE_URL}/openapi.json`,
	mcp: {
		server: `${BASE_URL}/.well-known/mcp-server.json`,
		endpoint: `${BASE_URL}/mcp`,
		transport: "streamable-http",
		authentication: "none",
	},
	tools: [
		{
			name: "check_email",
			description: "Validate one email address.",
			inputSchema: {
				type: "object",
				required: ["email"],
				properties: { email: { type: "string" } },
			},
		},
		{
			name: "check_domain",
			description: "Validate one domain.",
			inputSchema: {
				type: "object",
				required: ["domain"],
				properties: { domain: { type: "string" } },
			},
		},
		{
			name: "batch_check_emails",
			description: `Validate up to ${MAX_BATCH_SIZE} email addresses.`,
			inputSchema: {
				type: "object",
				required: ["emails"],
				properties: {
					emails: { type: "array", items: { type: "string" }, maxItems: MAX_BATCH_SIZE },
				},
			},
		},
		{
			name: "batch_check_domains",
			description: `Validate up to ${MAX_BATCH_SIZE} domains.`,
			inputSchema: {
				type: "object",
				required: ["domains"],
				properties: {
					domains: { type: "array", items: { type: "string" }, maxItems: MAX_BATCH_SIZE },
				},
			},
		},
		{
			name: "get_stats",
			description: "Return bloom-filter metadata.",
			inputSchema: { type: "object", properties: {} },
		},
	],
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

export const AGENT_SKILL_MD = `---
name: throwaway-email-validation
description: Validate whether emails or domains should be rejected as invalid, non-deliverable, filtered-DNS blocked, or disposable.
---

# throwaway email validation

Use this skill when deciding whether a signup, lead, or abuse-prevention workflow should reject an email address or domain.

## Tools

- REST: \`GET ${BASE_URL}/check?email=user@example.com\`
- REST: \`GET ${BASE_URL}/check?domain=example.com\`
- REST: \`POST ${BASE_URL}/check\`
- MCP: \`${BASE_URL}/mcp\` with \`check_email\`, \`check_domain\`, \`batch_check_emails\`, \`batch_check_domains\`, and \`get_stats\`

## Decision policy

Use \`should_reject\` as the coarse accept/reject signal. Inspect \`valid_tld\`, \`has_mx\`, \`dns_blocked\`, and \`disposable\` when you need an explanation. Do not treat \`disposable=true\` as proof of malicious intent.

## Privacy

Avoid logging full email addresses unless your application requires it. Prefer checking bare domains when user-level identity is not needed.
`;

export function agentSkillsIndex(sha256: string) {
	return {
		$schema: "https://agentskills.io/schemas/v0.2/skills-index.json",
		skills: [
			{
				name: "throwaway-email-validation",
				type: "skill-md",
				description:
					"Validate whether emails or domains should be rejected as invalid, non-deliverable, filtered-DNS blocked, or disposable.",
				url: `${BASE_URL}/.well-known/agent-skills/throwaway-email-validation/SKILL.md`,
				sha256,
			},
		],
	};
}

export const AGENT_CARD = {
	name: "throwaway",
	version,
	description:
		"Stateless validation agent for disposable email, invalid TLD, MX, and filtered-DNS signals.",
	provider: { organization: "SSLBoard", url: "https://sslboard.com" },
	url: BASE_URL,
	capabilities: {
		streaming: false,
		pushNotifications: false,
		stateTransitionHistory: false,
	},
	supportedInterfaces: [
		{
			url: `${BASE_URL}/mcp`,
			transport: "streamable-http",
			protocol: "mcp",
		},
		{
			url: `${BASE_URL}/openapi.json`,
			transport: "https",
			protocol: "openapi",
		},
	],
	skills: [
		{
			id: "email-validation",
			name: "Email validation",
			description:
				"Check one email address for invalid TLD, missing MX, filtered-DNS blocking, and disposable-domain status.",
		},
		{
			id: "domain-validation",
			name: "Domain validation",
			description:
				"Check one domain for invalid TLD, missing MX, filtered-DNS blocking, and disposable-domain status.",
		},
		{
			id: "batch-validation",
			name: "Batch validation",
			description: `Check up to ${MAX_BATCH_SIZE} emails or domains in one request.`,
		},
	],
	authentication: "none",
	endpoints: { rest: `${BASE_URL}/openapi.json`, mcp: `${BASE_URL}/mcp` },
};

export function jsonArtifact(value: unknown): string {
	return json(value);
}
