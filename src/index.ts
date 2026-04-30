import { parse as parseTld } from 'tldts';
import { BloomFilter } from './bloom';
import { BIT_COUNT, HASH_COUNT, ITEM_COUNT } from './generated/filter-meta';
import filterData from './generated/filter.bin';
import indexHtml from './index.html';

const filter = new BloomFilter(
	BIT_COUNT,
	HASH_COUNT,
	new Uint8Array(filterData),
);

/** Extract the domain from an email address (everything after last @, lowercased). */
function extractDomain(email: string): string | null {
	const atIndex = email.lastIndexOf('@');
	if (atIndex === -1 || atIndex === email.length - 1) return null;
	return email.slice(atIndex + 1).toLowerCase().trim();
}

/** Check whether a domain has a valid, ICANN-recognized TLD. */
function isValidTld(domain: string): boolean {
	const result = parseTld(domain);
	return result.isIcann === true && result.domain !== null;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function errorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, status);
}

async function handleCheck(request: Request): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === 'GET') {
		const email = url.searchParams.get('email');
		const domain = url.searchParams.get('domain');

		if (email) {
			const extracted = extractDomain(email);
			if (!extracted) {
				return errorResponse('Invalid email address', 400);
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

		return errorResponse(
			'Missing required query parameter: "email" or "domain"',
			400,
		);
	}

	// POST
	const rawBody = await request.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawBody);
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (
		typeof parsed !== 'object' ||
		parsed === null ||
		Array.isArray(parsed)
	) {
		return errorResponse('Request body must be a JSON object', 400);
	}

	const obj = parsed as Record<string, unknown>;

	if (Array.isArray(obj.emails)) {
		const results = (obj.emails as string[]).map((email) => {
			const extracted = extractDomain(email);
			return {
				email,
				domain: extracted ?? '',
				valid_tld: extracted ? isValidTld(extracted) : false,
				disposable: extracted ? filter.has(extracted) : false,
			};
		});
		return jsonResponse({ results });
	}

	if (Array.isArray(obj.domains)) {
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

	return errorResponse(
		'Request body must contain "emails" or "domains" array',
		400,
	);
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

		if (path === '/check') {
			if (request.method !== 'GET' && request.method !== 'POST') {
				return errorResponse('Method not allowed', 405);
			}
			return handleCheck(request);
		}

		if (path === '/stats') {
			if (request.method !== 'GET') {
				return errorResponse('Method not allowed', 405);
			}
			return handleStats();
		}

		if (path === '/') {
			return new Response(indexHtml, {
				headers: { 'Content-Type': 'text/html;charset=UTF-8' },
			});
		}

		return errorResponse('Not found', 404);
	},
};
