import llmsTxt from "../llms.txt";
import { textResponse, jsonResponse, wantsMarkdown } from "../http";
import {
	AGENT_CARD,
	AGENT_SKILLS,
	API_CATALOG,
	AUTH_MD,
	HOME_MARKDOWN,
	jsonArtifact,
	LLMS_FULL_TXT,
	MCP_SERVER_CARD,
	OPENAPI,
	ROBOTS_TXT,
	SITEMAP_XML,
	WEBMCP_MANIFEST,
} from "../agent-artifacts";

export async function handleHome(request: Request, env: Env): Promise<Response> {
	if (wantsMarkdown(request)) return textResponse(HOME_MARKDOWN, "text/markdown; charset=utf-8");
	return env.ASSETS.fetch(request);
}

export function handleLlms(): Response {
	return textResponse(llmsTxt, "text/plain; charset=utf-8", 200, {
		"Access-Control-Allow-Origin": "*",
	});
}

export function handleLlmsFull(): Response {
	return textResponse(LLMS_FULL_TXT, "text/plain; charset=utf-8", 200, {
		"Access-Control-Allow-Origin": "*",
	});
}

export function handleAuth(): Response {
	return textResponse(AUTH_MD, "text/markdown; charset=utf-8");
}

export function handleRobots(): Response {
	return textResponse(ROBOTS_TXT, "text/plain; charset=utf-8", 200, {
		"Cache-Control": "public, max-age=86400",
	});
}

export function handleSitemap(): Response {
	return textResponse(SITEMAP_XML, "application/xml; charset=utf-8", 200, {
		"Cache-Control": "public, max-age=86400",
	});
}

export function handleOpenApi(): Response {
	return jsonResponse(OPENAPI, 200, { "Content-Type": "application/openapi+json" });
}

export function handleApiCatalog(): Response {
	return jsonResponse(API_CATALOG);
}

export function handleMcpServerCard(): Response {
	return jsonResponse(MCP_SERVER_CARD);
}

export function handleWebMcp(): Response {
	return jsonResponse(WEBMCP_MANIFEST);
}

export function handleAgentSkills(): Response {
	return jsonResponse(AGENT_SKILLS);
}

export function handleAgentCard(): Response {
	return jsonResponse(AGENT_CARD);
}

export function rawOpenApiJson(): string {
	return jsonArtifact(OPENAPI);
}
