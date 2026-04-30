import { describe, it, expect } from 'vitest';
import { BloomFilter } from './bloom';
import { hashPair } from './hash';
import { extractDomain } from './test-utils';

// We'll import the generated filter data once the build has been run.
// For unit tests that don't need the full filter, we create small ones inline.

// ─── Bloom filter unit tests ────────────────────────────────────────────

describe('BloomFilter', () => {
	it('returns true for items that were added', () => {
		const filter = BloomFilter.fromItems(['foo.com', 'bar.com', 'baz.com'], 0.01);
		expect(filter.has('foo.com')).toBe(true);
		expect(filter.has('bar.com')).toBe(true);
		expect(filter.has('baz.com')).toBe(true);
	});

	it('returns false for items that were not added', () => {
		const filter = BloomFilter.fromItems(
			['disposable.com', 'trash-mail.com'],
			0.001,
		);
		expect(filter.has('gmail.com')).toBe(false);
		expect(filter.has('yahoo.com')).toBe(false);
	});

	it('has zero false negatives (deterministic check)', () => {
		const items = Array.from({ length: 1000 }, (_, i) => `domain${i}.com`);
		const filter = BloomFilter.fromItems(items, 0.001);
		for (const item of items) {
			expect(filter.has(item)).toBe(true);
		}
	});

	it('reports reasonable estimated FP rate', () => {
		const items = Array.from({ length: 1000 }, (_, i) => `domain${i}.com`);
		const filter = BloomFilter.fromItems(items, 0.001);
		const fpRate = filter.estimatedFpRate(items.length);
		expect(fpRate).toBeLessThan(0.01); // well under 1%
	});
});

// ─── Hash function tests ────────────────────────────────────────────────

describe('hashPair', () => {
	it('produces two different hash values', () => {
		const [h1, h2] = hashPair('test.com');
		expect(typeof h1).toBe('number');
		expect(typeof h2).toBe('number');
		expect(h1).not.toBe(h2);
	});

	it('is deterministic', () => {
		const [h1a, h2a] = hashPair('example.com');
		const [h1b, h2b] = hashPair('example.com');
		expect(h1a).toBe(h1b);
		expect(h2a).toBe(h2b);
	});

	it('produces different hashes for different inputs', () => {
		const [h1a] = hashPair('aaa.com');
		const [h1b] = hashPair('bbb.com');
		expect(h1a).not.toBe(h1b);
	});
});

// ─── Domain extraction tests ────────────────────────────────────────────

describe('extractDomain', () => {
	it('extracts domain from simple email', () => {
		expect(extractDomain('user@example.com')).toBe('example.com');
	});

	it('lowercases the domain', () => {
		expect(extractDomain('user@EXAMPLE.COM')).toBe('example.com');
	});

	it('handles leading/trailing whitespace', () => {
		expect(extractDomain('  user@example.com  ')).toBe('example.com');
	});

	it('handles multiple @ signs (uses last)', () => {
		expect(extractDomain('user@foo@example.com')).toBe('example.com');
	});

	it('returns null for empty string', () => {
		expect(extractDomain('')).toBeNull();
	});

	it('returns null for missing domain', () => {
		expect(extractDomain('user@')).toBeNull();
	});

	it('returns null for no @ sign', () => {
		expect(extractDomain('just-text')).toBeNull();
	});

	it('trims whitespace around domain', () => {
		expect(extractDomain('user@ example.com ')).toBe('example.com');
	});
});
