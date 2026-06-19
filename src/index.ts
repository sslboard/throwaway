import { Hono } from "hono";
import { handleCheck, handleHealth, handleStats } from "./routes/api";
import {
	handleAuth,
	handleHome,
	handleJsonArtifact,
	handleLinksetArtifact,
	handleLlms,
	handleLlmsFull,
	handleMarkdownArtifact,
	handleOpenApi,
	handleRobots,
	handleSitemap,
} from "./routes/discovery";
import { handleMcp } from "./routes/mcp";
import { CORS_HEADERS, errorResponse } from "./http";

type AppBindings = {
	Bindings: Env;
};

function methodNotAllowed(): Response {
	return errorResponse("Method not allowed", 405);
}

const app = new Hono<AppBindings>();

app.on("OPTIONS", "*", () => new Response(null, { status: 204, headers: CORS_HEADERS }));

app.on(["GET", "POST"], "/check", (c) => handleCheck(c.req.raw));
app.all("/check", methodNotAllowed);

app.get("/stats", handleStats);
app.all("/stats", methodNotAllowed);

app.get("/health", handleHealth);
app.all("/health", methodNotAllowed);

app.on(["GET", "POST"], "/mcp", (c) => handleMcp(c.req.raw));
app.all("/mcp", methodNotAllowed);

app.on(["GET", "HEAD"], "/llms.txt", (c) => handleLlms(c.req.raw, c.env));
app.all("/llms.txt", methodNotAllowed);

app.on(["GET", "HEAD"], "/llms-full.txt", (c) => handleLlmsFull(c.req.raw, c.env));
app.all("/llms-full.txt", methodNotAllowed);

app.on(["GET", "HEAD"], "/auth.md", (c) => handleAuth(c.req.raw, c.env));
app.all("/auth.md", methodNotAllowed);

app.on(["GET", "HEAD"], "/robots.txt", (c) => handleRobots(c.req.raw, c.env));
app.all("/robots.txt", methodNotAllowed);

app.get("/sitemap.xml", handleSitemap);
app.all("/sitemap.xml", methodNotAllowed);

app.on(["GET", "HEAD"], "/openapi.json", (c) => handleOpenApi(c.req.raw, c.env));
app.all("/openapi.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/api-catalog.json", (c) => handleJsonArtifact(c.req.raw, c.env));
app.all("/api-catalog.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/api-catalog", (c) => handleLinksetArtifact(c.req.raw, c.env));
app.all("/.well-known/api-catalog", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/mcp-server.json", (c) =>
	handleJsonArtifact(c.req.raw, c.env),
);
app.all("/.well-known/mcp-server.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/mcp/server-card.json", (c) =>
	handleJsonArtifact(c.req.raw, c.env),
);
app.all("/.well-known/mcp/server-card.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/webmcp", (c) => handleJsonArtifact(c.req.raw, c.env));
app.all("/.well-known/webmcp", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/agent-skills.json", (c) =>
	handleJsonArtifact(c.req.raw, c.env),
);
app.all("/.well-known/agent-skills.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/agent-skills/index.json", (c) =>
	handleJsonArtifact(c.req.raw, c.env),
);
app.all("/.well-known/agent-skills/index.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/agent-skills/throwaway-email-validation/SKILL.md", (c) =>
	handleMarkdownArtifact(c.req.raw, c.env),
);
app.all("/.well-known/agent-skills/throwaway-email-validation/SKILL.md", methodNotAllowed);

app.on(["GET", "HEAD"], "/.well-known/agent-card.json", (c) =>
	handleJsonArtifact(c.req.raw, c.env),
);
app.all("/.well-known/agent-card.json", methodNotAllowed);

app.on(["GET", "HEAD"], "/", (c) => handleHome(c.req.raw, c.env));

app.notFound((c) => {
	if (c.req.method === "GET" || c.req.method === "HEAD") {
		return c.env.ASSETS.fetch(c.req.raw);
	}
	return errorResponse("Not found", 404);
});

export default app;
