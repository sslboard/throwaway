import { textResponse, wantsMarkdown } from "../http";
import { SITEMAP_XML } from "../agent-artifacts";

export async function handleHome(request: Request, env: Env): Promise<Response> {
	if (wantsMarkdown(request)) {
		const markdownUrl = new URL("/index.md", request.url);
		return staticAssetResponse(
			new Request(markdownUrl, request),
			env,
			"text/markdown; charset=utf-8",
		);
	}
	return env.ASSETS.fetch(request);
}

async function staticAssetResponse(
	request: Request,
	env: Env,
	contentType: string,
	headers: Record<string, string> = {},
): Promise<Response> {
	const response = await env.ASSETS.fetch(request);
	const responseHeaders = new Headers(response.headers);
	responseHeaders.set("Content-Type", contentType);
	for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

export function handleLlms(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "text/plain; charset=utf-8", {
		"Access-Control-Allow-Origin": "*",
	});
}

export function handleLlmsFull(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "text/plain; charset=utf-8", {
		"Access-Control-Allow-Origin": "*",
	});
}

export function handleAuth(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "text/markdown; charset=utf-8");
}

export function handleRobots(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "text/plain; charset=utf-8", {
		"Cache-Control": "public, max-age=86400",
	});
}

export function handleSitemap(): Response {
	return textResponse(SITEMAP_XML, "application/xml; charset=utf-8", 200, {
		"Cache-Control": "public, max-age=86400",
	});
}

export function handleJsonArtifact(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "application/json; charset=utf-8");
}

export function handleLinksetArtifact(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "application/linkset+json; charset=utf-8");
}

export function handleMarkdownArtifact(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "text/markdown; charset=utf-8");
}

export function handleOpenApi(request: Request, env: Env): Promise<Response> {
	return staticAssetResponse(request, env, "application/openapi+json; charset=utf-8");
}
