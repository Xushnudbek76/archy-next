import { expect, test } from '@playwright/test';

test.skip(
  !process.env.REAL_API,
  'Demo content is verified against the real isolated FastAPI database.',
);

test('a visitor can explore saved study tools without changing the shared workspace', async ({
  page,
}) => {
  await page.goto('/en');
  await page.getByRole('link', { name: 'Try the demo', exact: true }).click();
  await page.getByRole('button', { name: 'Open sample workspace' }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByLabel('Sample workspace')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'New document', exact: true }),
  ).toBeDisabled();
  await page.getByRole('link', { name: /Database transactions/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Database transactions', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Summary notes' }).click();
  await expect(
    page.getByText('Hand-written sample content. No live AI request was made.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Regenerate study notes' }),
  ).toBeDisabled();
  await page.getByRole('tab', { name: 'Quizzes' }).click();
  await page
    .getByRole('button', { name: 'Database transactions', exact: true })
    .click();
  await expect(
    page.getByLabel('Quiz results').getByRole('status'),
  ).toContainText('4 of 5 correct');
  await expect(
    page.getByRole('button', { name: /Retry 1 incorrect/ }),
  ).toBeDisabled();
  await page.screenshot({
    path: 'test-results/demo-study.png',
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'AI tutor' }).click();
  await expect(
    page.getByText('Hand-written sample answer. No live AI request was made.'),
  ).toBeVisible();
  await expect(page.getByLabel('Your question')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'New conversation' }),
  ).toBeDisabled();
  const csrf = (await (await page.request.get('/api/auth/csrf')).json())
    .csrfToken;
  const rejected = await page.request.post('/api/documents', {
    data: { title: 'Should not exist' },
    headers: { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf },
  });
  expect(rejected.status()).toBe(403);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('the sample workspace remains usable on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Open sample workspace' }).click();
  await expect(page.getByLabel('Sample workspace')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /HTTP request essentials/ }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
