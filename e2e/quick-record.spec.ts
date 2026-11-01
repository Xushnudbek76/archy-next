import { expect, test } from '@playwright/test';
import { signInTestUser } from './helpers';

test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});
test.skip(
  !process.env.REAL_API,
  'Synthetic microphone capture saves to the isolated FastAPI database.',
);

test('standalone recording pauses, resumes, saves, and opens its persisted study document', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(
    context,
    `capture-${crypto.randomUUID()}@example.com`,
  );
  const course = await (
    await post('/api/courses', { title: 'Linear algebra' })
  ).json();
  await page.goto(`/record?courseId=${course.id}`);
  await page
    .getByLabel('Document title', { exact: true })
    .fill('Vectors lecture');
  await page
    .getByRole('button', { name: 'Open recorder', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Start recording', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause recording', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(650);
  await page
    .getByRole('button', { name: 'Pause recording', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Resume recording', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Resume recording', exact: true })
    .click();
  await page.waitForTimeout(850);
  await page
    .getByRole('button', { name: 'Stop recording', exact: true })
    .click();
  await expect(
    page.getByLabel('Recorded audio preview', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Save to document', exact: true })
    .click();
  await expect(
    page.getByText('Your recording is saved with this document.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Open study workspace', exact: true })
    .click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole('heading', { name: 'Vectors lecture', exact: true }),
  ).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  const document = await (
    await context.request.get(`/api/documents/${id}`)
  ).json();
  expect(document.recordingId).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto('/recordings');
  await page.getByLabel('Search recordings', { exact: true }).fill('Vectors');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Vectors lecture', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('capture-history.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole('article', { name: 'Vectors lecture', exact: true }),
  ).toBeVisible();
});
