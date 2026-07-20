import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  loginAndGetTokens,
  bridgeLogin,
  getRunId,
  cleanupTestData,
  createApi,
} from "./helpers.mjs";

let tokens;
let userId;
let api;
const RUN_ID = getRunId();
const EXPENSE_DESC = `${RUN_ID}-expense`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId);
});

test.afterAll(async () => {
  await cleanupTestData(userId);
});

test.describe.serial("expense management", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("expenses page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/expenses`);
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();
    await expect(page.getByText("Track business expenses")).toBeVisible();
  });

  test("add expense via API and verify on page", async ({ page }) => {
    const response = await api.post("/api/v1/expenses", {
      amount: 1500,
      description: EXPENSE_DESC,
    });
    expect(response.ok, `Expense API returned ${response.status}`).toBeTruthy();
    expect(response.data?.data?.expense?.id).toBeTruthy();

    await page.goto(`${EXCHANGE_URL}/expenses`);
    await expect(page.getByText(EXPENSE_DESC)).toBeVisible({ timeout: 15_000 });
  });

  test("expense form validation — empty amount", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/expenses`);

    const addButton = page.getByText("+ Add Expense");
    await addButton.waitFor({ state: "visible", timeout: 10_000 });
    await addButton.evaluate((el) => el.click());

    await page.getByRole("button", { name: "Save Expense" }).click();
    await expect(page.getByText("Amount must be greater than 0")).toBeVisible();
  });

  test("cancel closes expense form", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/expenses`);

    const addButton = page.getByText("+ Add Expense");
    await addButton.waitFor({ state: "visible", timeout: 10_000 });
    await addButton.evaluate((el) => el.click());

    await expect(page.getByText("New Expense")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("New Expense")).toBeHidden();
  });

  test("expense list shows recorded expense", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/expenses`);
    await expect(page.getByText(EXPENSE_DESC)).toBeVisible({ timeout: 15_000 });
  });
});
