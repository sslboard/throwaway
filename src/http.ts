export const BASE_URL = "https://throwaway.sslboard.com";

export const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export const SECURITY_HEADERS: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export const DISCOVERY_LINKS = [
	`<${BASE_URL}/llms.txt>; rel="llms"`,
	`<${BASE_URL}/llms-full.txt>; rel="alternate"; type="text/plain"`,
	`<${BASE_URL}/openapi.json>; rel="service-desc"; type="application/openapi+json"`,
	`<${BASE_URL}/api-catalog.json>; rel="service-meta"; type="application/json"`,
	`<${BASE_URL}/auth.md>; rel="authorization"; type="text/markdown"`,
	`<${BASE_URL}/.well-known/mcp-server.json>; rel="mcp-server"; type="application/json"`,
	`<${BASE_URL}/.well-known/agent-skills.json>; rel="service-meta"; type="application/json"`,
	`<${BASE_URL}/sitemap.xml>; rel="sitemap"; type="application/xml"`,
];

export const DISCOVERY_HEADERS: Record<string, string> = {
	Link: DISCOVERY_LINKS.join(", "),
};

export function jsonResponse(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...SECURITY_HEADERS,
			...CORS_HEADERS,
			...DISCOVERY_HEADERS,
			...headers,
		},
	});
}

export function textResponse(
	body: string,
	contentType: string,
	status = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": contentType,
			...SECURITY_HEADERS,
			...DISCOVERY_HEADERS,
			...headers,
		},
	});
}

export function errorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, status);
}

export function wantsMarkdown(request: Request): boolean {
	const url = new URL(request.url);
	if (url.searchParams.get("format") === "markdown") return true;
	return request.headers.get("Accept")?.includes("text/markdown") === true;
}
