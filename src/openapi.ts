import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { version } from "../package.json";
import { BASE_URL } from "./http";
import { MAX_BATCH_SIZE, MAX_BODY_SIZE } from "./limits";

type AppBindings = {
	Bindings: Env;
};

export const ErrorSchema = z
	.object({
		error: z.string(),
	})
	.openapi("Error");

export const CheckResultSchema = z
	.object({
		email: z.string().optional(),
		domain: z.string(),
		valid_tld: z.boolean(),
		has_mx: z.boolean(),
		dns_blocked: z.boolean().optional(),
		dns_blocked_category: z.enum(["malware", "family", "unknown"]).optional(),
		disposable: z.boolean(),
		should_reject: z.boolean(),
	})
	.openapi("CheckResult");

export const StatsSchema = z
	.object({
		itemCount: z.number().int(),
		bitCount: z.number().int(),
		hashCount: z.number().int(),
		byteSize: z.number().int(),
		falsePositiveRate: z.number(),
	})
	.openapi("Stats");

export const HealthSchema = z
	.object({
		version: z.string(),
	})
	.openapi("Health");

export const BatchEmailsRequestSchema = z
	.object({
		emails: z.array(z.string().email()).max(MAX_BATCH_SIZE),
	})
	.openapi("BatchEmailsRequest");

export const BatchDomainsRequestSchema = z
	.object({
		domains: z.array(z.string()).max(MAX_BATCH_SIZE),
	})
	.openapi("BatchDomainsRequest");

export const BatchResultSchema = z
	.object({
		results: z.array(CheckResultSchema),
	})
	.openapi("BatchResult");

export const CheckQuerySchema = z
	.object({
		email: z.string().email().optional(),
		domain: z.string().optional(),
	})
	.openapi("CheckQuery");

const JsonErrorResponse = {
	description: "Error",
	content: {
		"application/json": {
			schema: ErrorSchema,
		},
	},
} as const;

export const checkGetRoute = createRoute({
	method: "get",
	path: "/check",
	summary: "Check one email address or domain",
	request: {
		query: CheckQuerySchema,
	},
	responses: {
		200: {
			description: "Check result",
			content: {
				"application/json": {
					schema: CheckResultSchema,
				},
			},
		},
		400: JsonErrorResponse,
		405: JsonErrorResponse,
	},
});

export const checkPostRoute = createRoute({
	method: "post",
	path: "/check",
	summary: "Batch-check emails or domains",
	request: {
		body: {
			required: true,
			content: {
				"application/json": {
					schema: z.union([BatchEmailsRequestSchema, BatchDomainsRequestSchema]),
				},
			},
		},
	},
	responses: {
		200: {
			description: "Batch check results",
			content: {
				"application/json": {
					schema: BatchResultSchema,
				},
			},
		},
		400: JsonErrorResponse,
		413: JsonErrorResponse,
		405: JsonErrorResponse,
	},
});

export const statsRoute = createRoute({
	method: "get",
	path: "/stats",
	summary: "Return bloom-filter metadata",
	responses: {
		200: {
			description: "Filter stats",
			content: {
				"application/json": {
					schema: StatsSchema,
				},
			},
		},
		405: JsonErrorResponse,
	},
});

export const healthRoute = createRoute({
	method: "get",
	path: "/health",
	summary: "Return service version",
	responses: {
		200: {
			description: "Health result",
			content: {
				"application/json": {
					schema: HealthSchema,
				},
			},
		},
		405: JsonErrorResponse,
	},
});

export function registerOpenApiRoutes(app: OpenAPIHono<AppBindings>): void {
	app.openapi(checkGetRoute, (c) =>
		c.json(
			{
				domain: "example.com",
				valid_tld: true,
				has_mx: true,
				dns_blocked: false,
				disposable: false,
				should_reject: false,
			},
			200,
		),
	);
	app.openapi(checkPostRoute, (c) =>
		c.json(
			{
				results: [
					{
						domain: "example.com",
						valid_tld: true,
						has_mx: true,
						dns_blocked: false,
						disposable: false,
						should_reject: false,
					},
				],
			},
			200,
		),
	);
	app.openapi(statsRoute, (c) =>
		c.json(
			{
				itemCount: 0,
				bitCount: 0,
				hashCount: 0,
				byteSize: 0,
				falsePositiveRate: 0,
			},
			200,
		),
	);
	app.openapi(healthRoute, (c) => c.json({ version }, 200));
}

export function buildOpenApiDocument() {
	const app = new OpenAPIHono<AppBindings>();
	registerOpenApiRoutes(app);
	return app.getOpenAPI31Document({
		openapi: "3.1.0",
		info: {
			title: "throwaway API",
			version,
			description: "Public no-auth API for disposable email, TLD, MX, and filtered-DNS checks.",
			license: { name: "MIT" },
		},
		servers: [{ url: BASE_URL }],
		security: [],
	});
}

export { MAX_BATCH_SIZE, MAX_BODY_SIZE };
