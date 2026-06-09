import { expect, test, type Page } from "@playwright/test";

async function checkEmailShowsPills(page: Page, email: string, pills: string[]) {
	await page.goto("/");
	const input = page.getByPlaceholder("enter an email address");
	await input.fill(email);
	await input.press("Enter");
	await expect(page.locator(".result-inner.visible")).toBeVisible({ timeout: 30_000 });
	await expect(page.locator("#resultPills .result-verdict")).toHaveText(pills, { timeout: 30_000 });
	await expect(page.locator("#resultError")).toHaveText("");
}

test.describe("email checker UI", () => {
	test("chris@sslboard.com is accepted", async ({ page }) => {
		await checkEmailShowsPills(page, "chris@sslboard.com", ["Accept"]);
	});

	test("dejih87208@codoteam.com is rejected as disposable", async ({ page }) => {
		await checkEmailShowsPills(page, "dejih87208@codoteam.com", ["Reject", "Disposable"]);
	});

	test("asdasjhadskjhd@sajhsdkajhdkjsh.com is rejected for no MX records", async ({ page }) => {
		await checkEmailShowsPills(page, "asdasjhadskjhd@sajhsdkajhdkjsh.com", ["Reject", "No MX"]);
	});

	test("a@a.a is rejected as invalid", async ({ page }) => {
		await checkEmailShowsPills(page, "a@a.a", ["Reject", "Invalid TLD"]);
	});
});
