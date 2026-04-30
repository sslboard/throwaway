/**
 * Shared test utilities — mirrors the extractDomain logic from index.ts
 * so unit tests can use it without importing the worker entrypoint.
 */
export function extractDomain(email: string): string | null {
	const atIndex = email.lastIndexOf('@');
	if (atIndex === -1 || atIndex === email.length - 1) return null;
	return email
		.slice(atIndex + 1)
		.toLowerCase()
		.trim();
}
