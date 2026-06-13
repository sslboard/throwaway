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
	"/.well-known/mcp-server.json",
	"/.well-known/webmcp",
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

export const MCP_SERVER_CARD = {
	name: "throwaway",
	description: "Read-only disposable email/domain validation tools.",
	url: BASE_URL,
	transport: { type: "streamable-http", url: `${BASE_URL}/mcp` },
	authentication: { type: "none", documentation: `${BASE_URL}/auth.md` },
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
