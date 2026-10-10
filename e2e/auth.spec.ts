import { expect, test } from '@playwright/test';
import { emailLink } from './helpers';

test('account lifecycle, session refresh, logout and password recovery', async ({
  page,
  request,
}) => {
  const email = `auth-check-${Date.now()}@example.com`;
  const password = 'Clear-learning-passphrase-864!';
  await page.goto('/courses');
  await expect(page).toHaveURL(/\/login\?next=%2Fcourses/);
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Learning Owner');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('different-password');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page.getByRole('alert', { name: 'Form error' })).toContainText(
    'Passwords do not match',
  );
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  const confirmationResponse = await page.goto(await emailLink(request, email));
  expect(confirmationResponse?.headers()['referrer-policy']).toBe(
    'no-referrer',
  );
  expect(confirmationResponse?.headers()['cache-control']).toContain(
    'no-store',
  );
  await expect(
    page.getByRole('button', { name: 'Confirm my email' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/confirm-email$/);
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(
    page.getByRole('heading', { name: 'Email confirmed' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await page
    .getByRole('button', { name: 'Hide password', exact: true })
    .click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Form error' })).toContainText(
    'Check your email and password',
  );
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/courses');
  await expect(page.getByText('Learning Owner', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL('/courses');
  await expect(page.getByText('Learning Owner', { exact: true })).toBeVisible();
  const session = (await page.context().cookies()).find(
    (c) => c.name === 'sessionid',
  );
  expect(session?.httpOnly).toBe(true);
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === 'archy_return_to',
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => localStorage.getItem('accessToken')),
  ).toBeNull();
  let logoutAttempts = 0;
  await page.route('**/api/auth/logout', (route) => {
    logoutAttempts++;
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"code":"unavailable"}',
    });
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByText('Unable to sign out. Please try again.'),
  ).toBeVisible();
  await expect(page).toHaveURL('/courses');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => logoutAttempts).toBe(2);
  await expect(
    page.getByText('Unable to sign out. Please try again.'),
  ).toBeVisible();
  await page.unroute('**/api/auth/logout');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  await page.goto(await emailLink(request, email));
  await page
    .getByLabel('New password', { exact: true })
    .fill('New-learning-passphrase-975!');
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('New-learning-passphrase-975!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(
    page.getByRole('heading', { name: 'Password updated' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('New-learning-passphrase-975!');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/');
});

test('missing links and mobile account screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/login',
    '/signup',
    '/forgot-password',
    '/confirm-email',
    '/reset-password',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByText('This reset link is missing or invalid.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('invalid confirmation and reset links explain how to recover', async ({
  page,
}) => {
  await page.goto('/confirm-email?token=invalid-token');
  await page.getByRole('button', { name: 'Confirm my email' }).click();
  await expect(page.getByRole('alert', { name: 'Form error' })).toContainText(
    'expired or has already been used',
  );
  await page.goto('/reset-password?uid=missing-user&token=invalid-token');
  await page
    .getByLabel('New password', { exact: true })
    .fill('Unique-reset-password-856!');
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('Unique-reset-password-856!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('alert', { name: 'Form error' })).toContainText(
    'expired or been used',
  );
});

test('stale sessions lose access on every workspace route', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'sessionid', value: 'stale-session', url: 'http://127.0.0.1:3130' },
  ]);
  for (const path of ['/', '/courses', '/recordings', '/settings']) {
    await page.goto(path);
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
  }
});

test('account outage offers a retry without pretending to sign out', async ({
  page,
  context,
}) => {
  test.skip(
    Boolean(process.env.REAL_API),
    'Transport outage is controlled by the isolated fixture',
  );
  await context.addCookies([
    {
      name: 'sessionid',
      value: 'unavailable-session',
      url: 'http://127.0.0.1:3130',
    },
  ]);
  await page.goto('/courses');
  await expect(
    page.getByRole('heading', { name: 'We couldn’t reach your account.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
    'href',
    '/courses',
  );
  await expect(page).toHaveURL('/courses');
  expect(
    (await context.cookies()).some((cookie) => cookie.name === 'sessionid'),
  ).toBe(true);
});

test('a delayed accepted signup shows success without a second submission', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.REAL_API),
    'Delay is controlled only in the isolated fixture',
  );
  let submissions = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/signup') submissions++;
  });
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill('Slow connection');
  await page
    .getByLabel('Email', { exact: true })
    .fill(`delayed-signup-${Date.now()}@example.com`);
  await page
    .getByLabel('Password', { exact: true })
    .fill('Unique-delayed-passphrase-764!');
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill('Unique-delayed-passphrase-764!');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Creating account…' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  expect(submissions).toBe(1);
});
