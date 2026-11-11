import { expect, test } from "@playwright/test";

import { e2eClient, MARK } from "./env";

const stamp = `${MARK} ${Date.now()}`;

test.afterAll(async () => {
  const client = await e2eClient();
  await client.from("todos").delete().like("title", `${MARK} %`);
  await client.from("transactions").delete().like("merchant", `${MARK} %`);
});

test("opens Home signed in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("More", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Continue with Google")).toHaveCount(0);
});

test("adds a todo", async ({ page }) => {
  const title = `${stamp} todo`;
  await page.goto("/todo/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Add todo" }).click();
  // The form closes after the save. Leaving earlier cancels the save.
  await expect(page.getByRole("heading", { name: "New todo" })).toHaveCount(0);
  await page.goto("/todos");
  await expect(page.getByText(title)).toBeVisible();
});

test("adds an expense", async ({ page }) => {
  const merchant = `${stamp} expense`;
  await page.goto("/money/transaction/new");
  await page.getByLabel("Amount in ₱").fill("1");
  await page.getByLabel("Where / note").fill(merchant);
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByRole("heading", { name: "Add expense" })).toHaveCount(0);
  await page.goto("/money/transactions");
  await expect(page.getByText(merchant)).toBeVisible();
});

test("opens the vehicle services", async ({ page }) => {
  await page.goto("/vehicle");
  await expect(page.getByText(/Log another service|Add vehicle/).first()).toBeVisible();
});

test("opens the vault", async ({ page }) => {
  await page.goto("/vault");
  await expect(page.getByText(/Set up your vault|Vault is locked/).first()).toBeVisible();
});
