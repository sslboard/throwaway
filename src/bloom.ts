import { hashPair } from './hash';

/**
 * Bloom filter — supports both building (codegen) and querying (runtime).
 */
export class BloomFilter {
	constructor(
		public readonly bitCount: number,
		public readonly hashCount: number,
		public readonly data: Uint8Array,
	) {}

	/**
	 * Build a new bloom filter from the given items.
	 */
	static fromItems(items: string[], targetFpRate: number): BloomFilter {
		const n = items.length;
		// Optimal bit count: m = -(n * ln(p)) / (ln2)^2
		const bitCount = Math.ceil(
			(-n * Math.log(targetFpRate)) / (Math.LN2 * Math.LN2),
		);
		// Optimal hash count: k = (m/n) * ln2
		const hashCount = Math.max(1, Math.ceil((bitCount / n) * Math.LN2));
		const byteSize = Math.ceil(bitCount / 8);
		const data = new Uint8Array(byteSize);

		const filter = new BloomFilter(bitCount, hashCount, data);
		for (const item of items) {
			filter.add(item);
		}
		return filter;
	}

	add(item: string): void {
		const [h1, h2] = hashPair(item);
		for (let i = 0; i < this.hashCount; i++) {
			const hash = (h1 + i * h2) >>> 0;
			const bit = hash % this.bitCount;
			const byteIndex = bit >>> 3; // bit / 8
			const bitOffset = bit & 7; // bit % 8
			this.data[byteIndex] |= 1 << bitOffset;
		}
	}

	has(item: string): boolean {
		const [h1, h2] = hashPair(item);
		for (let i = 0; i < this.hashCount; i++) {
			const hash = (h1 + i * h2) >>> 0;
			const bit = hash % this.bitCount;
			const byteIndex = bit >>> 3;
			const bitOffset = bit & 7;
			if ((this.data[byteIndex] & (1 << bitOffset)) === 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Estimated false positive rate: (1 - e^(-k*n/m))^k
	 */
	estimatedFpRate(itemCount: number): number {
		const exponent = (-this.hashCount * itemCount) / this.bitCount;
		const inner = 1 - Math.exp(exponent);
		return Math.pow(inner, this.hashCount);
	}

	get byteSize(): number {
		return this.data.byteLength;
	}
}
