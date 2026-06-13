import { describe, it, expect } from "vitest";
import env from "./test-env";

// Integration tests — these use SELF.fetch via the vitest pool workers

describe("GET /check?email=...", () => {
	it("detects a disposable email", async () => {
		const res = await env.fetch(new Request("http://localhost/check?email=user@mailinator.com"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.email).toBe("user@mailinator.com");
		expect(body.domain).toBe("mailinator.com");
		expect(body.valid_tld).toBe(true);
		expect(body).toHaveProperty("has_mx");
		expect(body).toHaveProperty("dns_blocked");
		expect(body.disposable).toBe(true);
		expect(body.should_reject).toBe(true);
	});

	it("detects a legitimate email", async () => {
		const res = await env.fetch(new Request("http://localhost/check?email=john@yahoo.com"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.valid_tld).toBe(true);
		expect(body).toHaveProperty("has_mx");
		expect(body).toHaveProperty("dns_blocked");
		expect(body.disposable).toBe(false);
		expect(body.should_reject).toBe(!body.has_mx);
	});

	it("flags email with invalid TLD", async () => {
		const res = await env.fetch(new Request("http://localhost/check?email=user@fake.foobarbazqux"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.domain).toBe("fake.foobarbazqux");
		expect(body.valid_tld).toBe(false);
		expect(body.should_reject).toBe(true);
	});
});

describe("GET /check?domain=...", () => {
	it("detects a disposable domain", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=guerrillamail.com"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.valid_tld).toBe(true);
		expect(body).toHaveProperty("has_mx");
		expect(body).toHaveProperty("dns_blocked");
		expect(body.disposable).toBe(true);
		expect(body.should_reject).toBe(true);
	});

	it("detects a legitimate domain", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=proton.me"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.valid_tld).toBe(true);
		expect(body).toHaveProperty("has_mx");
		expect(body).toHaveProperty("dns_blocked");
		expect(body.disposable).toBe(false);
		expect(body.should_reject).toBe(!body.has_mx);
	});

	it("detects a supplemental domain (inraud.com)", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=inraud.com"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.valid_tld).toBe(true);
		expect(body).toHaveProperty("has_mx");
		expect(body).toHaveProperty("dns_blocked");
		expect(body.disposable).toBe(true);
		expect(body.should_reject).toBe(true);
	});

	it("flags domain with invalid TLD", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=example.xyz123"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.domain).toBe("example.xyz123");
		expect(body.valid_tld).toBe(false);
		expect(body.should_reject).toBe(true);
	});

	it("flags domain without MX records", async () => {
		const res = await env.fetch(
			new Request("http://localhost/check?domain=this-domain-does-not-exist-xyz123.com"),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			domain: string;
			valid_tld: boolean;
			has_mx: boolean;
			dns_blocked: boolean;
			dns_blocked_category?: "malware" | "family" | "unknown";
			disposable: boolean;
			should_reject: boolean;
		}>();
		expect(body.has_mx).toBe(false);
		expect(body.should_reject).toBe(true);
	});
});

describe("POST /check", () => {
	it("batch checks emails", async () => {
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					emails: ["user@mailinator.com", "john@yahoo.com", "test@guerrillamail.com"],
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			results: {
				email: string;
				domain: string;
				valid_tld: boolean;
				has_mx: boolean;
				dns_blocked: boolean;
				dns_blocked_category?: "malware" | "family" | "unknown";
				disposable: boolean;
				should_reject: boolean;
			}[];
		}>();
		expect(body.results).toHaveLength(3);
		expect(body.results[0].valid_tld).toBe(true);
		expect(body.results[0].has_mx).toBe(true);
		expect(body.results[0]).toHaveProperty("dns_blocked");
		expect(body.results[0].disposable).toBe(true);
		expect(body.results[1].valid_tld).toBe(true);
		expect(body.results[1].has_mx).toBe(true);
		expect(body.results[1].disposable).toBe(false);
		expect(body.results[2].valid_tld).toBe(true);
		expect(body.results[2].has_mx).toBe(true);
		expect(body.results[2].disposable).toBe(true);
		expect(body.results[0].should_reject).toBe(true);
		expect(body.results[1].should_reject).toBe(!body.results[1].has_mx);
		expect(body.results[2].should_reject).toBe(true);
	});

	it("batch checks domains", async () => {
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					domains: ["mailinator.com", "yahoo.com", "guerrillamail.com"],
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			results: {
				domain: string;
				valid_tld: boolean;
				has_mx: boolean;
				dns_blocked: boolean;
				dns_blocked_category?: "malware" | "family" | "unknown";
				disposable: boolean;
				should_reject: boolean;
			}[];
		}>();
		expect(body.results).toHaveLength(3);
		expect(body.results[0].valid_tld).toBe(true);
		expect(body.results[0].has_mx).toBe(true);
		expect(body.results[0]).toHaveProperty("dns_blocked");
		expect(body.results[0].disposable).toBe(true);
		expect(body.results[1].valid_tld).toBe(true);
		expect(body.results[1].has_mx).toBe(true);
		expect(body.results[1].disposable).toBe(false);
		expect(body.results[2].valid_tld).toBe(true);
		expect(body.results[2].has_mx).toBe(true);
		expect(body.results[2].disposable).toBe(true);
		expect(body.results.map((r) => r.should_reject)).toEqual([true, !body.results[1].has_mx, true]);
	});
});

describe("GET /stats", () => {
	it("returns filter metadata", async () => {
		const res = await env.fetch(new Request("http://localhost/stats"));
		expect(res.status).toBe(200);
		const body = await res.json<{
			itemCount: number;
			bitCount: number;
			hashCount: number;
			byteSize: number;
			falsePositiveRate: number;
		}>();
		expect(body.itemCount).toBeGreaterThan(50000);
		expect(body.bitCount).toBeGreaterThan(0);
		expect(body.hashCount).toBeGreaterThan(0);
		expect(body.byteSize).toBeGreaterThan(0);
		expect(body.falsePositiveRate).toBeGreaterThan(0);
		expect(body.falsePositiveRate).toBeLessThan(0.01);
	});
});

describe("GET /health", () => {
	it("returns package version", async () => {
		const res = await env.fetch(new Request("http://localhost/health"));
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("application/json");
		const body = await res.json<{ version: string }>();
		expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("405 for POST", async () => {
		const res = await env.fetch(new Request("http://localhost/health", { method: "POST" }));
		expect(res.status).toBe(405);
	});
});

describe("/llms.txt", () => {
	it("returns the llms.txt markdown", async () => {
		const res = await env.fetch(new Request("http://localhost/llms.txt"));
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/plain");
		const body = await res.text();
		expect(body).toContain("# throwaway");
		expect(body).toContain("https://throwaway.sslboard.com");
		expect(body).toContain("GET /check");
	});

	it("405 for POST", async () => {
		const res = await env.fetch(new Request("http://localhost/llms.txt", { method: "POST" }));
		expect(res.status).toBe(405);
	});
});

describe("CORS & security headers", () => {
	it("includes CORS headers on JSON responses", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=gmail.com"));
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
		expect(res.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
	});

	it("responds to preflight OPTIONS with 204", async () => {
		const res = await env.fetch(new Request("http://localhost/any-path", { method: "OPTIONS" }));
		expect(res.status).toBe(204);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("sets security headers on HTML page", async () => {
		const res = await env.fetch(new Request("http://localhost/"));
		expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
	});

	it("sets strict CSP on HTML page (no unsafe-inline)", async () => {
		const res = await env.fetch(new Request("http://localhost/"));
		const csp = res.headers.get("Content-Security-Policy") ?? "";
		expect(csp).toContain(
			"script-src 'self' https://analytics.ahrefs.com https://static.cloudflareinsights.com",
		);
		expect(csp).toContain("style-src 'self' https://fonts.googleapis.com");
		expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
		expect(csp).not.toContain("unsafe-inline");
	});

	it("serves static assets for the landing page", async () => {
		const css = await env.fetch(new Request("http://localhost/styles.css"));
		expect(css.status).toBe(200);
		expect(css.headers.get("Content-Type")).toContain("text/css");
		expect(await css.text()).toContain(".result-center");

		const js = await env.fetch(new Request("http://localhost/app.js"));
		expect(js.status).toBe(200);
		expect(js.headers.get("Content-Type")).toContain("javascript");
		expect(await js.text()).toContain("getElementById");
	});

	it("sets security headers on JSON responses", async () => {
		const res = await env.fetch(new Request("http://localhost/check?domain=gmail.com"));
		expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
	});
});

describe("Input limits", () => {
	it("413 for oversized batch emails array", async () => {
		const emails = Array.from({ length: 1001 }, (_, i) => `user${i}@example.com`);
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ emails }),
			}),
		);
		expect(res.status).toBe(413);
		const body = await res.json<{ error: string }>();
		expect(body.error).toContain("1000");
	});

	it("413 for oversized batch domains array", async () => {
		const domains = Array.from({ length: 1001 }, (_, i) => `domain${i}.com`);
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ domains }),
			}),
		);
		expect(res.status).toBe(413);
	});
});

describe("Error handling", () => {
	it("400 for missing params on GET /check", async () => {
		const res = await env.fetch(new Request("http://localhost/check"));
		expect(res.status).toBe(400);
		const body = await res.json<{ error: string }>();
		expect(body.error).toBeDefined();
	});

	it("400 for POST /check with empty body", async () => {
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
		);
		expect(res.status).toBe(400);
	});

	it("400 for POST /check with invalid JSON", async () => {
		const res = await env.fetch(
			new Request("http://localhost/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not json",
			}),
		);
		expect(res.status).toBe(400);
	});

	it("404 for unknown path", async () => {
		const res = await env.fetch(new Request("http://localhost/unknown"));
		expect(res.status).toBe(404);
	});

	it("200 with HTML for GET /", async () => {
		const res = await env.fetch(new Request("http://localhost/"));
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/html");
		const body = await res.text();
		expect(body).toContain("throwaway");
	});

	it("405 for unsupported method on /check", async () => {
		const res = await env.fetch(new Request("http://localhost/check", { method: "DELETE" }));
		expect(res.status).toBe(405);
	});

	it("405 for unsupported method on /stats", async () => {
		const res = await env.fetch(new Request("http://localhost/stats", { method: "POST" }));
		expect(res.status).toBe(405);
	});
});

describe("agent-readiness discovery", () => {
	it("serves markdown homepage when requested", async () => {
		const res = await env.fetch(
			new Request("http://localhost/", { headers: { Accept: "text/markdown" } }),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/markdown");
		expect(await res.text()).toContain("/openapi.json");
	});

	it("serves no-auth documentation", async () => {
		const res = await env.fetch(new Request("http://localhost/auth.md"));
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("No API key is required");
	});

	it("serves OpenAPI and API catalog metadata", async () => {
		const openapi = await env.fetch(new Request("http://localhost/openapi.json"));
		expect(openapi.status).toBe(200);
		expect(openapi.headers.get("Content-Type")).toContain("application/openapi+json");
		expect(await openapi.json()).toHaveProperty("openapi", "3.1.0");

		const catalog = await env.fetch(new Request("http://localhost/api-catalog.json"));
		expect(catalog.status).toBe(200);
		expect(await catalog.json()).toHaveProperty("authentication", "none");
	});

	it("serves MCP, skill, and agent discovery metadata", async () => {
		const mcp = await env.fetch(new Request("http://localhost/.well-known/mcp-server.json"));
		expect(mcp.status).toBe(200);
		expect(await mcp.json()).toHaveProperty("authentication.type", "none");

		const skills = await env.fetch(new Request("http://localhost/.well-known/agent-skills.json"));
		expect(skills.status).toBe(200);
		expect(await skills.text()).toContain("should_reject");

		const card = await env.fetch(new Request("http://localhost/.well-known/agent-card.json"));
		expect(card.status).toBe(200);
		expect(await card.text()).toContain("email_validation");
	});

	it("advertises discovery resources in robots, sitemap, and Link headers", async () => {
		const robots = await env.fetch(new Request("http://localhost/robots.txt"));
		expect(await robots.text()).toContain("LLMS: https://throwaway.sslboard.com/llms.txt");

		const sitemap = await env.fetch(new Request("http://localhost/sitemap.xml"));
		expect(await sitemap.text()).toContain("https://throwaway.sslboard.com/openapi.json");

		const stats = await env.fetch(new Request("http://localhost/stats"));
		expect(stats.headers.get("Link")).toContain("/openapi.json");
	});

	it("lists MCP tools", async () => {
		const res = await env.fetch(
			new Request("http://localhost/mcp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
			}),
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("check_email");
	});
});
