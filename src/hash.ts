/**
 * cyrb53-inspired hash returning two independent 32-bit unsigned integers
 * from a single pass. Both accumulators are cross-mixed in the final step
 * for good independence. This avoids the 53-bit → 32-bit truncation bug
 * that occurs when using the classic cyrb53 return value with `>>> 0`.
 */
export function hashPair(value: string): [number, number] {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;

	for (let i = 0; i < value.length; i++) {
		const ch = value.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}

	// Final avalanche — cross-mix h1 and h2
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h2 >>> 13), 3266489909);

	return [h1 >>> 0, h2 >>> 0];
}
