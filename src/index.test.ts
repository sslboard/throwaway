import { describe, it, expect } from 'vitest';
import env from './test-env';

// Integration tests — these use SELF.fetch via the vitest pool workers

describe('GET /check?email=...', () => {
	it('detects a disposable email', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?email=user@mailinator.com'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			disposable: boolean;
		}>();
		expect(body.email).toBe('user@mailinator.com');
		expect(body.domain).toBe('mailinator.com');
		expect(body.valid_tld).toBe(true);
		expect(body.disposable).toBe(true);
	});

	it('detects a legitimate email', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?email=john@yahoo.com'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			disposable: boolean;
		}>();
		expect(body.valid_tld).toBe(true);
		expect(body.disposable).toBe(false);
	});

	it('flags email with invalid TLD', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?email=user@fake.foobarbazqux'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			email: string;
			domain: string;
			valid_tld: boolean;
			disposable: boolean;
		}>();
		expect(body.domain).toBe('fake.foobarbazqux');
		expect(body.valid_tld).toBe(false);
	});
});

describe('GET /check?domain=...', () => {
	it('detects a disposable domain', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?domain=guerrillamail.com'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{ domain: string; valid_tld: boolean; disposable: boolean }>();
		expect(body.valid_tld).toBe(true);
		expect(body.disposable).toBe(true);
	});

	it('detects a legitimate domain', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?domain=proton.me'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{ domain: string; valid_tld: boolean; disposable: boolean }>();
		expect(body.valid_tld).toBe(true);
		expect(body.disposable).toBe(false);
	});

	it('flags domain with invalid TLD', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check?domain=example.xyz123'),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{ domain: string; valid_tld: boolean; disposable: boolean }>();
		expect(body.domain).toBe('example.xyz123');
		expect(body.valid_tld).toBe(false);
	});
});

describe('POST /check', () => {
	it('batch checks emails', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					emails: [
						'user@mailinator.com',
						'john@yahoo.com',
						'test@guerrillamail.com',
					],
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			results: { email: string; domain: string; valid_tld: boolean; disposable: boolean }[];
		}>();
		expect(body.results).toHaveLength(3);
		expect(body.results[0].valid_tld).toBe(true);
		expect(body.results[0].disposable).toBe(true);
		expect(body.results[1].valid_tld).toBe(true);
		expect(body.results[1].disposable).toBe(false);
		expect(body.results[2].valid_tld).toBe(true);
		expect(body.results[2].disposable).toBe(true);
	});

	it('batch checks domains', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					domains: ['mailinator.com', 'yahoo.com', 'guerrillamail.com'],
				}),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json<{
			results: { domain: string; valid_tld: boolean; disposable: boolean }[];
		}>();
		expect(body.results).toHaveLength(3);
		expect(body.results[0].valid_tld).toBe(true);
		expect(body.results[0].disposable).toBe(true);
		expect(body.results[1].valid_tld).toBe(true);
		expect(body.results[1].disposable).toBe(false);
		expect(body.results[2].valid_tld).toBe(true);
		expect(body.results[2].disposable).toBe(true);
	});
});

describe('GET /stats', () => {
	it('returns filter metadata', async () => {
		const res = await env.fetch(new Request('http://localhost/stats'));
		expect(res.status).toBe(200);
		const body = await res.json<{
			itemCount: number;
			bitCount: number;
			hashCount: number;
			byteSize: number;
			falsePositiveRate: number;
		}>();
		expect(body.itemCount).toBeGreaterThan(100000);
		expect(body.bitCount).toBeGreaterThan(0);
		expect(body.hashCount).toBeGreaterThan(0);
		expect(body.byteSize).toBeGreaterThan(0);
		expect(body.falsePositiveRate).toBeGreaterThan(0);
		expect(body.falsePositiveRate).toBeLessThan(0.01);
	});
});

describe('Error handling', () => {
	it('400 for missing params on GET /check', async () => {
		const res = await env.fetch(new Request('http://localhost/check'));
		expect(res.status).toBe(400);
		const body = await res.json<{ error: string }>();
		expect(body.error).toBeDefined();
	});

	it('400 for POST /check with empty body', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}),
		);
		expect(res.status).toBe(400);
	});

	it('400 for POST /check with invalid JSON', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not json',
			}),
		);
		expect(res.status).toBe(400);
	});

	it('404 for unknown path', async () => {
		const res = await env.fetch(new Request('http://localhost/unknown'));
		expect(res.status).toBe(404);
	});

	it('200 with HTML for GET /', async () => {
		const res = await env.fetch(new Request('http://localhost/'));
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toContain('text/html');
		const body = await res.text();
		expect(body).toContain('throwaway');
	});

	it('405 for unsupported method on /check', async () => {
		const res = await env.fetch(
			new Request('http://localhost/check', { method: 'DELETE' }),
		);
		expect(res.status).toBe(405);
	});

	it('405 for unsupported method on /stats', async () => {
		const res = await env.fetch(
			new Request('http://localhost/stats', { method: 'POST' }),
		);
		expect(res.status).toBe(405);
	});
});
