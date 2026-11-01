import { expect, test } from '@playwright/test';
import { signInTestUser } from './helpers';

test.skip(
  !process.env.REAL_API,
  'Saved preferences use the isolated FastAPI database.',
);

test('profile, language, and a custom note format survive reload', async ({
  page,
  context,
}) => {
  await signInTestUser(
    context,
    `preferences-${crypto.randomUUID()}@example.com`,
  );
  await page.goto('/settings/account');
  await page.getByLabel('Display name', { exact: true }).fill('Kim Learner');
  await page
    .getByLabel('University', { exact: true })
    .fill('Gachon University');
  await page.getByLabel('Department', { exact: true }).fill('Computer Science');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByLabel('University', { exact: true })).toHaveValue(
    'Gachon University',
  );
  await expect(
    page.getByRole('heading', { name: 'Kim Learner', exact: true }),
  ).toBeVisible();
  await page.goto('/settings/formats');
  await page.getByLabel('Name', { exact: true }).fill('Weekly review');
  await page
    .getByLabel('Instructions', { exact: true })
    .fill('Organize the lecture as short questions and clear explanations.');
  await page
    .getByRole('button', { name: 'Create format', exact: true })
    .click();
  await page.getByRole('radio', { name: /Weekly review/ }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(
    page.getByRole('radio', { name: /Weekly review/ }),
  ).toBeChecked();
  await page.goto('/settings/language');
  await page
    .getByRole('combobox', { name: 'Interface language', exact: true })
    .selectOption('ko');
  await page
    .getByRole('combobox', { name: 'Summary language', exact: true })
    .selectOption('en');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('저장됨');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(
    page.getByRole('combobox', { name: '화면 언어', exact: true }),
  ).toHaveValue('ko');
  const preferences = await (
    await context.request.get('/api/preferences')
  ).json();
  expect(preferences.summaryLanguage).toBe('en');
  expect(preferences.noteFormat).toMatch(/^[0-9a-f-]{36}$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('navigation', { name: 'Quick navigation' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('preferences-mobile.png'),
    fullPage: true,
  });
});

test('standalone capture prepares an owned study document and forged checkout cannot activate a plan', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(
    context,
    `record-entry-${crypto.randomUUID()}@example.com`,
  );
  const course = await (
    await post('/api/courses', { title: 'Discrete mathematics' })
  ).json();
  await page.goto(`/record?courseId=${course.id}`);
  await page
    .getByLabel('Document title', { exact: true })
    .fill('Monday lecture');
  await page
    .getByRole('button', { name: 'Open recorder', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Monday lecture', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start recording', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open document', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Monday lecture', exact: true }),
  ).toBeVisible();
  await page.goto('/billing/success?orderId=forged&status=paid');
  await expect(
    page.getByRole('heading', { name: 'Check your payment status.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open billing', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Archy Free', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('No payments yet.', { exact: true }),
  ).toBeVisible();
  const summary = await (await context.request.get('/api/billing')).json();
  expect(summary.plan).toBe('free');
});

test('public guide and install metadata work on mobile without private caching', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/en', '/features', '/pricing', '/help']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByText('Record a lecture', { exact: true }).click();
  await expect(
    page.getByText('Open Record and choose a course.', { exact: false }),
  ).toBeVisible();
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/dashboard');
  expect(manifest.icons).toHaveLength(3);
  await page.screenshot({
    path: test.info().outputPath('help-mobile.png'),
    fullPage: true,
  });
});

test('switching accounts refreshes every private form before another save', async ({
  page,
  context,
}) => {
  await signInTestUser(context, `switch-a-${crypto.randomUUID()}@example.com`);
  const csrf = (await (await context.request.get('/api/auth/csrf')).json())
    .csrfToken;
  expect(
    (
      await context.request.patch('/api/preferences', {
        data: { displayName: 'Account A', university: 'University A' },
        headers: { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/settings/account');
  await expect(page.getByLabel('University', { exact: true })).toHaveValue(
    'University A',
  );
  await signInTestUser(context, `switch-b-${crypto.randomUUID()}@example.com`);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Display name', { exact: true })).toHaveValue(
    'Lecture Owner',
  );
  await expect(page.getByLabel('University', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  const value = await (await context.request.get('/api/preferences')).json();
  expect(value.university).toBe('');
});
