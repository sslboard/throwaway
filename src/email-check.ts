import { parse as parseTld } from "tldts";
import { BloomFilter } from "./bloom";
import { BIT_COUNT, HASH_COUNT, ITEM_COUNT } from "./generated/filter-meta";
import filterData from "./generated/filter.bin";

const filter = new BloomFilter(BIT_COUNT, HASH_COUNT, new Uint8Array(filterData));

export const MAX_BODY_SIZE = 100_000;
export const MAX_BATCH_SIZE = 1000;

export type DnsBlockedCategory = "malware" | "family" | "unknown";

type DnsQuery = {
	ok: boolean;
	status?: number;
	hasAnswer: boolean;
	blocked: boolean;
};

export type MxResolution = {
	hasMx: boolean;
	dnsBlocked?: boolean;
	dnsBlockedCategory?: DnsBlockedCategory;
};

export type CheckPayload = {
	email?: string;
	domain: string;
	valid_tld: boolean;
	has_mx: boolean;
	dns_blocked?: boolean;
	dns_blocked_category?: DnsBlockedCategory;
	disposable: boolean;
	should_reject: boolean;
};

export function extractDomain(email: string): string | null {
	const atIndex = email.lastIndexOf("@");
	if (atIndex === -1 || atIndex === email.length - 1) return null;
	return email
		.slice(atIndex + 1)
		.toLowerCase()
		.trim();
}

export function isValidTld(domain: string): boolean {
	const result = parseTld(domain);
	return result.isIcann === true && result.domain !== null;
}

const FAMILY_DOH = "https://family.cloudflare-dns.com/dns-query";
const SECURITY_DOH = "https://security.cloudflare-dns.com/dns-query";
const UNFILTERED_DOH = "https://cloudflare-dns.com/dns-query";

async function queryDns(endpoint: string, domain: string, type: "A" | "MX"): Promise<DnsQuery> {
	try {
		const res = await fetch(`${endpoint}?name=${encodeURIComponent(domain)}&type=${type}`, {
			headers: { Accept: "application/dns-json" },
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return { ok: false, hasAnswer: false, blocked: false };
		const data = (await res.json()) as {
			Status?: number;
			Answer?: { data?: string }[];
			Comment?: string[];
		};
		const answers = Array.isArray(data.Answer) ? data.Answer : [];
		const blocked =
			data.Status === 5 ||
			data.Comment?.some((comment) => /filtered|blocked|censored/i.test(comment)) === true ||
			answers.some((answer) => answer.data === "0.0.0.0");
		return {
			ok: data.Status === 0 || data.Status === 3,
			status: data.Status,
			hasAnswer: answers.length > 0,
			blocked,
		};
	} catch {
		return { ok: false, hasAnswer: false, blocked: false };
	}
}

async function resolveMx(domain: string): Promise<MxResolution> {
	const mx = await queryDns(UNFILTERED_DOH, domain, "MX");
	if (!mx.ok || !mx.hasAnswer) {
		return { hasMx: false };
	}

	const family = await queryDns(FAMILY_DOH, domain, "A");
	if (!family.blocked) {
		return { hasMx: true, dnsBlocked: false };
	}

	const security = await queryDns(SECURITY_DOH, domain, "A");
	const dnsBlockedCategory = security.blocked ? "malware" : security.ok ? "family" : "unknown";
	return { hasMx: true, dnsBlocked: true, dnsBlockedCategory };
}

function shouldReject(
	validTld: boolean,
	hasMx: boolean,
	disposable: boolean,
	dnsBlocked = false,
): boolean {
	return !validTld || !hasMx || disposable || dnsBlocked;
}

function mxForInvalidDomain(): MxResolution {
	return { hasMx: false };
}

export function buildCheckPayload(fields: {
	email?: string;
	domain: string;
	validTld: boolean;
	mx: MxResolution;
	disposable: boolean;
}): CheckPayload {
	return {
		...(fields.email !== undefined ? { email: fields.email } : {}),
		domain: fields.domain,
		valid_tld: fields.validTld,
		has_mx: fields.mx.hasMx,
		...(fields.mx.dnsBlocked !== undefined ? { dns_blocked: fields.mx.dnsBlocked } : {}),
		...(fields.mx.dnsBlockedCategory ? { dns_blocked_category: fields.mx.dnsBlockedCategory } : {}),
		disposable: fields.disposable,
		should_reject: shouldReject(
			fields.validTld,
			fields.mx.hasMx,
			fields.disposable,
			fields.mx.dnsBlocked,
		),
	};
}

async function resolveMxBatch(domains: string[]): Promise<Map<string, MxResolution>> {
	const result = new Map<string, MxResolution>();
	const CONCURRENCY = 20;
	for (let i = 0; i < domains.length; i += CONCURRENCY) {
		const slice = domains.slice(i, i + CONCURRENCY);
		const entries = await Promise.all(slice.map(async (d) => [d, await resolveMx(d)] as const));
		for (const [d, has] of entries) result.set(d, has);
	}
	return result;
}

export async function checkEmail(email: string): Promise<CheckPayload | null> {
	const domain = extractDomain(email);
	if (!domain) return null;
	const validTld = isValidTld(domain);
	const mx = validTld ? await resolveMx(domain) : mxForInvalidDomain();
	const disposable = filter.has(domain);
	return buildCheckPayload({ email, domain, validTld, mx, disposable });
}

export async function checkDomain(domain: string): Promise<CheckPayload> {
	const normalized = domain.toLowerCase().trim();
	const validTld = isValidTld(normalized);
	const mx = validTld ? await resolveMx(normalized) : mxForInvalidDomain();
	const disposable = filter.has(normalized);
	return buildCheckPayload({ domain: normalized, validTld, mx, disposable });
}

export async function batchCheckEmails(emails: string[]): Promise<CheckPayload[]> {
	const emailEntries = emails.map((email) => {
		const extracted = extractDomain(email);
		return { email, extracted };
	});
	const validDomains = [
		...new Set(
			emailEntries.map((e) => e.extracted).filter((d): d is string => !!d && isValidTld(d)),
		),
	];
	const mxMap = await resolveMxBatch(validDomains);
	return emailEntries.map(({ email, extracted }) => {
		const validTld = extracted ? isValidTld(extracted) : false;
		const mx =
			validTld && extracted ? (mxMap.get(extracted) ?? mxForInvalidDomain()) : mxForInvalidDomain();
		const disposable = extracted ? filter.has(extracted) : false;
		return buildCheckPayload({ email, domain: extracted ?? "", validTld, mx, disposable });
	});
}

export async function batchCheckDomains(domains: string[]): Promise<CheckPayload[]> {
	const normalizedDomains = domains.map((domain) => domain.toLowerCase().trim());
	const uniqueValid = [...new Set(normalizedDomains.filter((d) => isValidTld(d)))];
	const mxMap = await resolveMxBatch(uniqueValid);
	return normalizedDomains.map((normalized) => {
		const validTld = isValidTld(normalized);
		const mx = validTld ? (mxMap.get(normalized) ?? mxForInvalidDomain()) : mxForInvalidDomain();
		const disposable = filter.has(normalized);
		return buildCheckPayload({ domain: normalized, validTld, mx, disposable });
	});
}

export function getStats() {
	return {
		itemCount: ITEM_COUNT,
		bitCount: BIT_COUNT,
		hashCount: HASH_COUNT,
		byteSize: filter.byteSize,
		falsePositiveRate: filter.estimatedFpRate(ITEM_COUNT),
	};
}
