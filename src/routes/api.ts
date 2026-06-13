import { version } from "../../package.json";
import {
	batchCheckDomains,
	batchCheckEmails,
	checkDomain,
	checkEmail,
	getStats,
	MAX_BATCH_SIZE,
	MAX_BODY_SIZE,
} from "../email-check";
import { errorResponse, jsonResponse } from "../http";

export async function handleCheck(request: Request): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === "GET") {
		const email = url.searchParams.get("email");
		const domain = url.searchParams.get("domain");
		if (email && domain) return errorResponse('Use either "email" or "domain", not both', 400);
		if (email) {
			const payload = await checkEmail(email);
			if (!payload) return errorResponse("Invalid email address", 400);
			return jsonResponse(payload);
		}
		if (domain) return jsonResponse(await checkDomain(domain));
		return errorResponse('Missing required query parameter: "email" or "domain"', 400);
	}

	const rawBody = await request.text();
	if (rawBody.length > MAX_BODY_SIZE) return errorResponse("Request body too large", 413);

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
	if (Array.isArray(obj.emails) && Array.isArray(obj.domains)) {
		return errorResponse('Request body must contain either "emails" or "domains", not both', 400);
	}
	if (Array.isArray(obj.emails)) {
		if (obj.emails.length > MAX_BATCH_SIZE)
			return errorResponse(`Batch size exceeds ${MAX_BATCH_SIZE}`, 413);
		return jsonResponse({ results: await batchCheckEmails(obj.emails as string[]) });
	}
	if (Array.isArray(obj.domains)) {
		if (obj.domains.length > MAX_BATCH_SIZE)
			return errorResponse(`Batch size exceeds ${MAX_BATCH_SIZE}`, 413);
		return jsonResponse({ results: await batchCheckDomains(obj.domains as string[]) });
	}
	return errorResponse('Request body must contain "emails" or "domains" array', 400);
}

export function handleStats(): Response {
	return jsonResponse(getStats());
}

export function handleHealth(): Response {
	return jsonResponse({ version });
}
