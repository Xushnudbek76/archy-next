import { expect, test, type BrowserContext } from '@playwright/test';
import { emailLink } from './helpers';

async function signIn(context: BrowserContext, email: string) {
  const request = context.request;
  const password = 'Private-course-test-passphrase-821!';
  const post = async (path: string, data: unknown) => {
    const csrf = (await (await request.get('/api/auth/csrf')).json()).csrfToken;
    return request.post(path, {
      data,
      headers: { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf },
    });
  };
  expect(
    (
      await post('/api/auth/signup', {
        email,
        password,
        passwordConfirmation: password,
        displayName: 'Course Owner',
      })
    ).status(),
  ).toBe(202);
  const token = new URL(await emailLink(request, email)).searchParams.get(
    'token',
  );
  expect((await post('/api/auth/confirm-email', { token })).status()).toBe(200);
  expect((await post('/api/auth/login', { email, password })).status()).toBe(
    200,
  );
}

test('Unicode title boundaries and disappearing pages recover correctly', async ({
  page,
  context,
}) => {
  await signIn(context, `course-boundaries-${Date.now()}@example.com`);
  await page.goto('/courses');
  await expect(
    page.getByRole('heading', { name: 'No courses yet' }),
  ).toBeVisible();
  const title = '📚'.repeat(100);
  await page.getByLabel('Course title', { exact: true }).fill(`  ${title}  `);
  await expect(page.getByLabel('Course title', { exact: true })).toHaveValue(
    `  ${title}  `,
  );
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  const card = page.getByRole('article', { name: title });
  await expect(card).toBeVisible();
  const original = (await (await context.request.get('/api/courses')).json())
    .items[0];
  await card.getByRole('button', { name: 'Rename' }).click();
  await card.getByLabel('New title').fill('🧠'.repeat(101));
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert', { name: 'Course error' })).toContainText(
    'between 1 and 100',
  );
  const renamedTitle = '🧠'.repeat(100);
  await card.getByLabel('New title').fill(` ${renamedTitle} `);
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('article', { name: renamedTitle })).toBeVisible();
  const csrf = (await (await context.request.get('/api/auth/csrf')).json())
    .csrfToken;
  const headers = { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf };
  for (let i = 0; i < 20; i++) {
    expect(
      (
        await context.request.post('/api/courses', {
          data: { title: `Page course ${i}` },
          headers,
        })
      ).status(),
    ).toBe(201);
  }
  await page.getByRole('button', { name: 'Refresh courses' }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('article', { name: renamedTitle })).toBeVisible();
  expect(
    (
      await context.request.post(`/api/courses/${original.id}/archive`, {
        data: {},
        headers,
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Refresh courses' }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.getByRole('article', { name: renamedTitle })).toHaveCount(
    0,
  );
});

test('courses persist, recover from errors, stay private and archive on mobile', async ({
  page,
  context,
  browser,
}) => {
  await signIn(context, `courses-${Date.now()}@example.com`);
  await page.goto('/courses');
  await expect(
    page.getByRole('heading', { name: 'No courses yet' }),
  ).toBeVisible();
  await page.getByLabel('Course title', { exact: true }).fill('  선형 대수  ');
  await page.getByLabel('Course title', { exact: true }).press('Enter');
  const card = page.getByRole('article', { name: '선형 대수' });
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Rename' }).click();
  await card.getByLabel('New title').fill('Linear algebra');
  await page.route('**/api/courses/*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"code":"unavailable"}',
        })
      : route.continue(),
  );
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert', { name: 'Course error' })).toContainText(
    'temporarily unavailable',
  );
  await expect(card).toBeVisible();
  await page.unroute('**/api/courses/*');
  await card.getByRole('button', { name: 'Save' }).click();
  const renamed = page.getByRole('article', { name: 'Linear algebra' });
  await expect(renamed).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('courses-desktop.png'),
    fullPage: true,
  });
  const list = await (await context.request.get('/api/courses')).json();
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:3130' });
  try {
    await signIn(other, `other-courses-${Date.now()}@example.com`);
    const otherPage = await other.newPage();
    await otherPage.goto('/courses');
    await expect(
      otherPage.getByRole('heading', { name: 'No courses yet' }),
    ).toBeVisible();
    const csrf = (await (await other.request.get('/api/auth/csrf')).json())
      .csrfToken;
    const response = await other.request.patch(
      `/api/courses/${list.items[0].id}`,
      {
        data: { title: 'Stolen' },
        headers: { Origin: 'http://127.0.0.1:3130', 'X-CSRFToken': csrf },
      },
    );
    expect(response.status()).toBe(404);
  } finally {
    await other.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await renamed.getByRole('button', { name: 'Archive', exact: true }).click();
  await renamed.getByRole('button', { name: 'Cancel' }).click();
  await expect(renamed).toBeVisible();
  await renamed.getByRole('button', { name: 'Archive', exact: true }).click();
  await renamed.getByRole('button', { name: 'Confirm archive' }).click();
  await expect(
    page.getByRole('heading', { name: 'No courses yet' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(renamed).toBeVisible();
  await expect(renamed.getByRole('button', { name: 'Rename' })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.route('**/api/courses**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"code":"unavailable"}',
    }),
  );
  await page
    .getByRole('button', { name: 'Refresh courses', exact: true })
    .click();
  await expect(page.getByRole('alert', { name: 'Course error' })).toContainText(
    'temporarily unavailable',
  );
  await page.unroute('**/api/courses**');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(renamed).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath('courses-mobile.png'),
    fullPage: true,
  });
});
