import { describe, expect, it } from "vitest";

const DOMAIN = "throwaway.sslboard.com";
const DOH_URL = "https://cloudflare-dns.com/dns-query";

// DNS-AID service endpoints that must have HTTPS (SVCB type 65) records
const EXPECTED_SERVICE_NAMES = ["_index._agents", "_mcp._agents", "_a2a._agents"];

// TXT index record must list these agent resource URLs
const EXPECTED_TXT_RESOURCE_URLS = [
	"https://throwaway.sslboard.com/llms.txt",
	"https://throwaway.sslboard.com/openapi.json",
	"https://throwaway.sslboard.com/api-catalog.json",
	"https://throwaway.sslboard.com/.well-known/mcp-server.json",
];

interface DohAnswer {
	name: string;
	type: number;
	data: string;
}

interface DohResponse {
	Status: number;
	Answer?: DohAnswer[];
}

async function dohQuery(name: string, type: string): Promise<DohResponse> {
	const url = new URL(DOH_URL);
	url.searchParams.set("name", name);
	url.searchParams.set("type", type);

	const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
	expect(res.status).toBe(200);
	return res.json<DohResponse>();
}

function normalizeTxtData(data: string): string {
	const chunks = [...data.matchAll(/"((?:\\.|[^"])*)"/g)].map((match) =>
		match[1].replace(/\\"/g, '"'),
	);
	return chunks.length > 0 ? chunks.join("") : data;
}

describe("DNS agent discovery (DNS-AID)", () => {
	it("publishes HTTPS service records under _agents namespace", async () => {
		for (const svcName of EXPECTED_SERVICE_NAMES) {
			const fqdn = `${svcName}.${DOMAIN}`;
			let body: DohResponse | undefined;

			// Retry up to 3 times to allow for DNS propagation
			for (let attempt = 0; attempt < 3; attempt += 1) {
				body = await dohQuery(fqdn, "HTTPS");
				if (body.Answer && body.Answer.length > 0) break;
				await new Promise((resolve) => setTimeout(resolve, 1_000));
			}

			expect(body?.Answer).toBeDefined();
			expect(body!.Answer!.length).toBeGreaterThan(0);
			expect(body!.Answer![0].type).toBe(65); // HTTPS = SVCB type 65
		}
	});

	it("publishes a TXT index record listing agent resources", async () => {
		const fqdn = `_index._agents.${DOMAIN}`;
		let records: string[] = [];

		for (let attempt = 0; attempt < 3; attempt += 1) {
			const body = await dohQuery(fqdn, "TXT");
			records =
				body.Answer?.filter((a) => a.type === 16).map((a) => normalizeTxtData(a.data)) ?? [];
			if (records.length > 0) break;
			await new Promise((resolve) => setTimeout(resolve, 1_000));
		}

		expect(records.length).toBeGreaterThan(0);
		const indexTxt = records[0];
		expect(indexTxt).toContain("v=dnsaid1");

		for (const url of EXPECTED_TXT_RESOURCE_URLS) {
			expect(indexTxt).toContain(url);
		}
	});
});
