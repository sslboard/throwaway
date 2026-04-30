import { parse as parseTld } from "tldts";
import { BloomFilter } from "./bloom";
import { BIT_COUNT, HASH_COUNT, ITEM_COUNT } from "./generated/filter-meta";
import filterData from "./generated/filter.bin";
import indexHtml from "./index.html";
import llmsTxt from "./llms.txt";
import ogImage from "./throwaway.jpg";
import logoSvg from "./throwaway.svg";

const filter = new BloomFilter(BIT_COUNT, HASH_COUNT, new Uint8Array(filterData));

/** Extract the domain from an email address (everything after last @, lowercased). */
function extractDomain(email: string): string | null {
	const atIndex = email.lastIndexOf("@");
	if (atIndex === -1 || atIndex === email.length - 1) return null;
	return email
		.slice(atIndex + 1)
		.toLowerCase()
		.trim();
}

/** Check whether a domain has a valid, ICANN-recognized TLD. */
function isValidTld(domain: string): boolean {
	const result = parseTld(domain);
	return result.isIcann === true && result.domain !== null;
}

const ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /check
Allow: /stats
Allow: /llms.txt

Sitemap: https://throwaway.sslboard.com/sitemap.xml
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://throwaway.sslboard.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

/** Common security headers applied to all responses. */
const SECURITY_HEADERS: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** CSP for the HTML page — allows Ahrefs analytics + Google Fonts. */
const CSP_HEADER: Record<string, string> = {
	"Content-Security-Policy": [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://analytics.ahrefs.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https://analytics.ahrefs.com",
		"connect-src 'self' https://analytics.ahrefs.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; "),
};

const MAX_BODY_SIZE = 100_000; // 100 KB
const MAX_BATCH_SIZE = 1000;

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...SECURITY_HEADERS,
			...CORS_HEADERS,
		},
	});
}

function errorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, status);
}

async function handleCheck(request: Request): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === "GET") {
		const email = url.searchParams.get("email");
		const domain = url.searchParams.get("domain");

		if (email) {
			const extracted = extractDomain(email);
			if (!extracted) {
				return errorResponse("Invalid email address", 400);
			}
			return jsonResponse({
				email,
				domain: extracted,
				valid_tld: isValidTld(extracted),
				disposable: filter.has(extracted),
			});
		}

		if (domain) {
			const normalized = domain.toLowerCase().trim();
			return jsonResponse({
				domain: normalized,
				valid_tld: isValidTld(normalized),
				disposable: filter.has(normalized),
			});
		}

		return errorResponse('Missing required query parameter: "email" or "domain"', 400);
	}

	// POST
	const rawBody = await request.text();

	if (rawBody.length > MAX_BODY_SIZE) {
		return errorResponse("Request body too large", 413);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		return errorResponse("Invalid JSON body", 400);
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return errorResponse("Request body must be a JSON object", 400);
	}

	const obj = parsed as Record<string, unknown>;

	if (Array.isArray(obj.emails)) {
		if (obj.emails.length > MAX_BATCH_SIZE) {
			return errorResponse(`Batch size exceeds ${MAX_BATCH_SIZE}`, 413);
		}
		const results = (obj.emails as string[]).map((email) => {
			const extracted = extractDomain(email);
			return {
				email,
				domain: extracted ?? "",
				valid_tld: extracted ? isValidTld(extracted) : false,
				disposable: extracted ? filter.has(extracted) : false,
			};
		});
		return jsonResponse({ results });
	}

	if (Array.isArray(obj.domains)) {
		if (obj.domains.length > MAX_BATCH_SIZE) {
			return errorResponse(`Batch size exceeds ${MAX_BATCH_SIZE}`, 413);
		}
		const results = (obj.domains as string[]).map((domain) => {
			const normalized = domain.toLowerCase().trim();
			return {
				domain: normalized,
				valid_tld: isValidTld(normalized),
				disposable: filter.has(normalized),
			};
		});
		return jsonResponse({ results });
	}

	return errorResponse('Request body must contain "emails" or "domains" array', 400);
}

function handleStats(): Response {
	return jsonResponse({
		itemCount: ITEM_COUNT,
		bitCount: BIT_COUNT,
		hashCount: HASH_COUNT,
		byteSize: filter.byteSize,
		falsePositiveRate: filter.estimatedFpRate(ITEM_COUNT),
	});
}

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if (path === "/check") {
			if (request.method !== "GET" && request.method !== "POST") {
				return errorResponse("Method not allowed", 405);
			}
			return handleCheck(request);
		}

		if (path === "/stats") {
			if (request.method !== "GET") {
				return errorResponse("Method not allowed", 405);
			}
			return handleStats();
		}

		if (path === "/llms.txt") {
			if (request.method !== "GET") {
				return errorResponse("Method not allowed", 405);
			}
			return new Response(llmsTxt, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					...SECURITY_HEADERS,
					...CORS_HEADERS,
				},
			});
		}

		if (path === "/robots.txt") {
			return new Response(ROBOTS_TXT, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "public, max-age=86400",
					...SECURITY_HEADERS,
				},
			});
		}

		if (path === "/sitemap.xml") {
			return new Response(SITEMAP_XML, {
				headers: {
					"Content-Type": "application/xml; charset=utf-8",
					"Cache-Control": "public, max-age=86400",
					...SECURITY_HEADERS,
				},
			});
		}

		if (path === "/throwaway.jpg") {
			return new Response(ogImage, {
				headers: {
					"Content-Type": "image/jpeg",
					"Cache-Control": "public, max-age=604800, immutable",
					...SECURITY_HEADERS,
				},
			});
		}

		if (path === "/throwaway.svg") {
			return new Response(logoSvg, {
				headers: {
					"Content-Type": "image/svg+xml; charset=utf-8",
					"Cache-Control": "public, max-age=604800, immutable",
					...SECURITY_HEADERS,
				},
			});
		}

		if (path === "/") {
			return new Response(indexHtml, {
				headers: {
					"Content-Type": "text/html;charset=UTF-8",
					...SECURITY_HEADERS,
					...CSP_HEADER,
					...CORS_HEADERS,
				},
			});
		}

		// Preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}

		return errorResponse("Not found", 404);
	},
};
