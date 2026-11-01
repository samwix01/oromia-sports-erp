import { expect, test } from '@playwright/test';

test.describe('shell (M0-T04)', () => {
  test('opens in Afaan Oromo and switches language', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/om\/$/);
    await expect(page.getByRole('link', { name: 'Giddugala Ispoortii Dijitaalaa Oromiyaa' })).toBeVisible();

    await page.getByRole('combobox').nth(1).selectOption('en');
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

    await page.getByRole('combobox').nth(1).selectOption('am');
    await expect(page.getByRole('heading', { name: 'እንኳን ደህና መጡ' })).toBeVisible();
  });

  test('calendar toggle switches between Ethiopian and Gregorian', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.getByText(/Today: .* EC/)).toBeVisible();
    await page.getByRole('button', { name: 'Gregorian' }).click();
    await expect(page.getByText(/Today: \d{4}-\d{2}-\d{2}/)).toBeVisible();
  });
});

test('command centre shows missing data as "No report received", not zero (rule 5)', async ({ page }) => {
  await page.goto('/en/bureau/');
  await expect(page.getByRole('heading', { name: 'Regional command centre' })).toBeVisible();
  await expect(page.getByText('No report received')).toBeVisible();
});

test('federation workspace lists only its own sport (rule 7)', async ({ page }) => {
  await page.goto('/en/athletics/');
  await expect(page.getByRole('link', { name: 'Demo Club B' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Demo Club A' })).toHaveCount(0);
});

test('entry review needs a human decision with a reason for every flagged member (rule 4)', async ({ page }) => {
  await page.goto('/en/football/entries/');
  const accept = page.getByRole('button', { name: 'Accept entry' });
  await expect(accept).toBeDisabled();

  const flagged = ['p-102', 'p-002'];
  const row = page.getByTestId(`member-${flagged[0]}`);
  await row.getByRole('button', { name: 'Refuse' }).click();
  await expect(row.getByText('A reason is required.')).toBeVisible();
  await row.getByLabel('Reason').fill('Over age for U17 (demo)');
  await row.getByRole('button', { name: 'Refuse' }).click();

  const row2 = page.getByTestId(`member-${flagged[1]}`);
  await row2.getByLabel('Reason').fill('Registrar confirmed different person (demo)');
  await row2.getByRole('button', { name: 'Allow (override)' }).click();

  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page.getByText('Entry accepted')).toBeVisible();
});

test('a published result is corrected as a new version, never overwritten (rule 3)', async ({ page }) => {
  await page.goto('/en/results/ev-fb-1/');
  const status = page.getByTestId('current-status');
  await expect(status).toHaveText('Draft');
  await page.getByRole('button', { name: /^Submit/ }).click();
  await page.getByRole('button', { name: /^Validate/ }).click();
  await page.getByRole('button', { name: /^Publish/ }).click();
  await expect(status).toHaveText('Published');

  await page.getByRole('button', { name: 'Correct result' }).click();
  await page.getByTestId('goals-home').fill('1');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('A reason is required.')).toBeVisible();
  await page.getByLabel('Reason').fill('Protest upheld (demo)');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  const versions = page.getByTestId('versions');
  await expect(versions.getByText('Version 2')).toBeVisible();
  await expect(versions.getByText('Version 1')).toBeVisible();
  await expect(versions.getByText('Superseded').first()).toBeVisible();
  await expect(versions.getByText('2–1')).toBeVisible();
  await expect(versions.getByText('1–1')).toBeVisible();
});
