import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://127.0.0.1:8788",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command:
			"test -f src/generated/filter.bin || npm run build:filter && npx wrangler dev --port 8788",
		url: "http://127.0.0.1:8788/",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
