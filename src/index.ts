import { handleCheck, handleHealth, handleStats } from "./routes/api";
import {
	handleAgentCard,
	handleAgentSkills,
	handleApiCatalog,
	handleAuth,
	handleHome,
	handleLlms,
	handleLlmsFull,
	handleMcpServerCard,
	handleOpenApi,
	handleRobots,
	handleSitemap,
} from "./routes/discovery";
import { handleMcp } from "./routes/mcp";
import { CORS_HEADERS, errorResponse } from "./http";

function methodNotAllowed(): Response {
	return errorResponse("Method not allowed", 405);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (path === "/check") {
			if (request.method !== "GET" && request.method !== "POST") return methodNotAllowed();
			return handleCheck(request);
		}

		if (path === "/stats") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleStats();
		}

		if (path === "/health") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleHealth();
		}

		if (path === "/mcp") {
			if (request.method !== "GET" && request.method !== "POST") return methodNotAllowed();
			return handleMcp(request);
		}

		if (path === "/llms.txt") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleLlms();
		}

		if (path === "/llms-full.txt") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleLlmsFull();
		}

		if (path === "/auth.md") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleAuth();
		}

		if (path === "/robots.txt") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleRobots();
		}

		if (path === "/sitemap.xml") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleSitemap();
		}

		if (path === "/openapi.json") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleOpenApi();
		}

		if (path === "/api-catalog.json") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleApiCatalog();
		}

		if (path === "/.well-known/mcp-server.json") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleMcpServerCard();
		}

		if (path === "/.well-known/agent-skills.json") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleAgentSkills();
		}

		if (path === "/.well-known/agent-card.json") {
			if (request.method !== "GET") return methodNotAllowed();
			return handleAgentCard();
		}

		if (path === "/" && (request.method === "GET" || request.method === "HEAD")) {
			return handleHome(request, env);
		}

		if (request.method === "GET" || request.method === "HEAD") {
			return env.ASSETS.fetch(request);
		}

		return errorResponse("Not found", 404);
	},
};
