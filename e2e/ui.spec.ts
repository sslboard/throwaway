import { expect, test, type Page } from "@playwright/test";

async function checkEmailShowsVerdict(page: Page, email: string, verdict: string) {
	await page.goto("/");
	const input = page.getByPlaceholder("enter an email address");
	await input.fill(email);
	await input.press("Enter");
	await expect(page.locator(".result-inner.visible")).toBeVisible({ timeout: 30_000 });
	await expect(page.locator("#resultVerdict")).toHaveText(verdict, { timeout: 30_000 });
	await expect(page.locator("#resultError")).toHaveText("");
}

test.describe("email checker UI", () => {
	test("chris@sslboard.com is shown as legitimate", async ({ page }) => {
		await checkEmailShowsVerdict(page, "chris@sslboard.com", "legitimate");
	});

	test("dejih87208@codoteam.com is shown as disposable", async ({ page }) => {
		await checkEmailShowsVerdict(page, "dejih87208@codoteam.com", "disposable");
	});

	test("asdasjhadskjhd@sajhsdkajhdkjsh.com is shown as no MX records", async ({ page }) => {
		await checkEmailShowsVerdict(page, "asdasjhadskjhd@sajhsdkajhdkjsh.com", "no MX records");
	});

	test("a@a.a is shown as invalid", async ({ page }) => {
		await checkEmailShowsVerdict(page, "a@a.a", "invalid");
	});
});
