import { expect, test } from '@playwright/test';
import { signInTestUser } from './helpers';

test.skip(
  !process.env.REAL_API,
  'Academic persistence uses the real isolated FastAPI database.',
);

test('a semester and weekly classes persist, open filtered materials and become read-only after archival', async ({
  page,
  context,
}) => {
  await signInTestUser(context, `academic-${crypto.randomUUID()}@example.com`);
  await page.goto('/timetable');
  await page.getByLabel('New semester', { exact: true }).fill('2026 Fall');
  await page.getByRole('button', { name: 'Add semester', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Semester', exact: true })
    .selectOption({ label: '2026 Fall' });
  await page.getByLabel('New timetable', { exact: true }).fill('Main classes');
  await page
    .getByRole('button', { name: 'Add timetable', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: '2026 Fall · Main classes' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await page
    .getByLabel('Course name', { exact: true })
    .fill('Database systems');
  await page.getByLabel('Professor', { exact: true }).fill('Professor Kim');
  await page
    .getByRole('button', { name: 'Add class time', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Wed', exact: true }).check();
  await page.getByLabel('Room', { exact: true }).fill('301');
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Database systems', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Database systems', exact: true }),
  ).toBeVisible();
  await page.goto('/dashboard');
  await page
    .getByRole('link', { name: /Database systems Professor Kim/ })
    .click();
  await expect(page).toHaveURL(/\/documents\?courseId=/);
  const id = new URL(page.url()).searchParams.get('courseId');
  await expect(
    page.getByRole('combobox', { name: 'Course folder', exact: true }),
  ).toHaveValue(id!);
  await page.goto('/timetable');
  await page
    .getByRole('button', { name: 'Archive semester', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm archive', exact: true })
    .click();
  await expect(
    page.getByText('Archived · Read-only', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add class', exact: true }),
  ).toBeDisabled();
  await page.goto(`/documents?courseId=${id}`);
  await expect(
    page.getByRole('button', { name: 'New document', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/timetable');
  await expect(
    page.getByRole('navigation', { name: 'Quick navigation' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
