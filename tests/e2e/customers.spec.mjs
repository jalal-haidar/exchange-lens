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
const CUSTOMER_NAME = `${RUN_ID}-customer`;
const UPDATED_NAME = `${RUN_ID}-updated`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId, tokens.accessToken);
});

test.afterAll(async () => {
  await cleanupTestData(userId, tokens.accessToken);
});

test.describe.serial("customer CRUD", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("customer list page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  });

  test("create customer via modal", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    const addBtn = page.getByText("+ Add Customer");
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });
    await addBtn.evaluate((element) => element.click());

    const dialog = page.getByRole("dialog", { name: "Add Customer" });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Customer name").fill(CUSTOMER_NAME);
    await dialog.getByPlaceholder("Phone number").fill("+92-300-9999999");
    await dialog.getByRole("button", { name: "Add Customer" }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(CUSTOMER_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test("search customer by name", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(CUSTOMER_NAME);
    await expect(page.getByText(CUSTOMER_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test("view customer detail", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(CUSTOMER_NAME);
    await page.getByText(CUSTOMER_NAME).first().click();
    await expect(page.getByRole("heading", { name: CUSTOMER_NAME })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Transaction Ledger")).toBeVisible();
  });

  test("customer quick actions on detail page", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(CUSTOMER_NAME);
    await page.getByText(CUSTOMER_NAME).first().click();
    await expect(page.getByRole("heading", { name: CUSTOMER_NAME })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Buy from Customer")).toBeVisible();
    await expect(page.getByText("Sell to Customer")).toBeVisible();
    await expect(page.getByText("Give Credit")).toBeVisible();
  });

  test("edit customer via modal", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(CUSTOMER_NAME);
    await page.getByRole("button", { name: `Edit ${CUSTOMER_NAME}` }).click();

    const dialog = page.getByRole("dialog", { name: "Edit Customer" });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Customer name").clear();
    await dialog.getByPlaceholder("Customer name").fill(UPDATED_NAME);

    const customersRes = await api.get(`/api/v1/customers?search=${CUSTOMER_NAME}`);
    const customer = customersRes.data?.data?.customers?.find((entry) => entry.name === CUSTOMER_NAME);
    await api.put(`/api/v1/customers/${customer.id}`, { name: UPDATED_NAME });

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(UPDATED_NAME);
    await expect(page.getByText(UPDATED_NAME)).toBeVisible({ timeout: 15_000 });
  });

  test("deactivate customer with confirmation dialog", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill(UPDATED_NAME);
    await page.getByRole("button", { name: `Deactivate ${UPDATED_NAME}` }).click();

    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText(UPDATED_NAME, { exact: false })).toBeVisible();

    await confirmDialog.getByRole("button", { name: "Deactivate" }).click();
    await expect(confirmDialog).toBeHidden({ timeout: 15_000 });

    await page.getByPlaceholder(/search/i).fill(UPDATED_NAME);
    await expect(page.getByText("No customers yet")).toBeVisible({ timeout: 15_000 });
  });

  test("empty search shows no results", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    await page.getByPlaceholder(/search/i).fill("zzz_nonexistent_customer_99999");
    await expect(page.getByText("No customers yet")).toBeVisible({ timeout: 15_000 });
  });

  test("customer form validation - empty name", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    const addBtn = page.getByText("+ Add Customer");
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });
    await addBtn.evaluate((element) => element.click());

    const dialog = page.getByRole("dialog", { name: "Add Customer" });
    await dialog.getByRole("button", { name: "Add Customer" }).click();
    await expect(dialog.getByText("Name is required")).toBeVisible();
  });

  test("cancel closes customer form", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/customers`);
    const addBtn = page.getByText("+ Add Customer");
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });
    await addBtn.evaluate((element) => element.click());

    const dialog = page.getByRole("dialog", { name: "Add Customer" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
