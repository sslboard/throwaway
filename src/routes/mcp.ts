import {
	batchCheckDomains,
	batchCheckEmails,
	checkDomain,
	checkEmail,
	getStats,
} from "../email-check";
import { errorResponse, jsonResponse } from "../http";

const tools = [
	{
		name: "check_email",
		description:
			"Check one email address for valid TLD, MX deliverability, filtered-DNS blocking, and disposable-domain status.",
		inputSchema: { type: "object", required: ["email"], properties: { email: { type: "string" } } },
	},
	{
		name: "check_domain",
		description:
			"Check one domain for valid TLD, MX deliverability, filtered-DNS blocking, and disposable-domain status.",
		inputSchema: {
			type: "object",
			required: ["domain"],
			properties: { domain: { type: "string" } },
		},
	},
	{
		name: "batch_check_emails",
		description: "Check up to 1000 email addresses.",
		inputSchema: {
			type: "object",
			required: ["emails"],
			properties: { emails: { type: "array", items: { type: "string" }, maxItems: 1000 } },
		},
	},
	{
		name: "batch_check_domains",
		description: "Check up to 1000 domains.",
		inputSchema: {
			type: "object",
			required: ["domains"],
			properties: { domains: { type: "array", items: { type: "string" }, maxItems: 1000 } },
		},
	},
	{
		name: "get_stats",
		description: "Return bloom-filter metadata.",
		inputSchema: { type: "object", properties: {} },
	},
];

function mcpResult(id: unknown, result: unknown): Response {
	return jsonResponse({ jsonrpc: "2.0", id, result });
}

function mcpError(id: unknown, code: number, message: string): Response {
	return jsonResponse(
		{ jsonrpc: "2.0", id, error: { code, message } },
		code === -32600 ? 400 : 200,
	);
}

export async function handleMcp(request: Request): Promise<Response> {
	if (request.method === "GET") {
		return jsonResponse({ name: "throwaway", protocol: "mcp", tools });
	}

	let payload: {
		id?: unknown;
		method?: string;
		params?: { name?: string; arguments?: Record<string, unknown> };
	};
	try {
		payload = (await request.json()) as typeof payload;
	} catch {
		return errorResponse("Invalid JSON body", 400);
	}

	if (payload.method === "tools/list") return mcpResult(payload.id, { tools });
	if (payload.method !== "tools/call") return mcpError(payload.id, -32601, "Method not found");

	const name = payload.params?.name;
	const args = payload.params?.arguments ?? {};
	if (name === "check_email" && typeof args.email === "string") {
		const result = await checkEmail(args.email);
		if (!result) return mcpError(payload.id, -32602, "Invalid email address");
		return mcpResult(payload.id, { content: [{ type: "json", json: result }] });
	}
	if (name === "check_domain" && typeof args.domain === "string") {
		return mcpResult(payload.id, {
			content: [{ type: "json", json: await checkDomain(args.domain) }],
		});
	}
	if (name === "batch_check_emails" && Array.isArray(args.emails)) {
		return mcpResult(payload.id, {
			content: [
				{ type: "json", json: { results: await batchCheckEmails(args.emails as string[]) } },
			],
		});
	}
	if (name === "batch_check_domains" && Array.isArray(args.domains)) {
		return mcpResult(payload.id, {
			content: [
				{ type: "json", json: { results: await batchCheckDomains(args.domains as string[]) } },
			],
		});
	}
	if (name === "get_stats")
		return mcpResult(payload.id, { content: [{ type: "json", json: getStats() }] });
	return mcpError(payload.id, -32602, "Unknown tool or invalid arguments");
}
