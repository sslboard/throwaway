import { defineConfig } from "vitest/config";
import { cloudflarePool } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
	test: {
		// Default Vitest globs also match `e2e/*.spec.ts` (Playwright). Those must not run in the
		// Workers pool — wrong runtime and extra isolates contribute to flaky workerd teardown (SIGSEGV on macOS).
		include: ["src/**/*.test.ts"],
		exclude: ["**/node_modules/**", "e2e/**"],
		pool: cloudflarePool({
			wrangler: { configPath: "./wrangler.jsonc" },
		}),
	},
});
