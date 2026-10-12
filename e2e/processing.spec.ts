import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { signInTestUser } from './helpers';

function sample() {
  const bytes = Buffer.alloc(44 + 16000, 128);
  bytes.write('RIFF');
  bytes.writeUInt32LE(36 + 16000, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(16000, 40);
  return bytes;
}

test('private recording becomes saved fixture notes through the actual worker', async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    !process.env.REAL_API,
    'Processing persistence uses the real disposable database.',
  );
  const post = await signInTestUser(
    context,
    `processing-${Date.now()}@example.com`,
  );
  await post('/api/courses', { title: 'Programming' });
  await page.goto('/recordings');
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Functions lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'lecture.wav',
    mimeType: 'audio/wav',
    buffer: sample(),
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  const card = page.getByRole('article', {
    name: 'Functions lecture',
    exact: true,
  });
  await expect(card).toBeVisible();
  const id = (await (await context.request.get('/api/recordings')).json())
    .items[0].id;
  let polls = 0;
  page.on('request', (r) => {
    if (r.url().endsWith(`/api/processing/${id}`)) polls++;
  });
  await page.waitForTimeout(500);
  expect(polls).toBe(0);
  await card.getByText('Transcript and notes', { exact: true }).click();
  await expect(card).toContainText('Waiting to process');
  const backend = fileURLToPath(new URL('../../archy-api/', import.meta.url));
  execFileSync(
    `${backend}.venv-fastapi/bin/python`,
    ['-m', 'tests.run_fixture_processing', id],
    { cwd: backend },
  );
  await expect(card).toContainText('Lecture notes are ready.', {
    timeout: 20000,
  });
  await expect(
    card.getByRole('region', { name: 'Lecture notes' }),
  ).toContainText('Synthetic test fixture');
  await expect(card.getByRole('region', { name: 'Transcript' })).toContainText(
    'Synthetic fixture',
  );
  const before = polls;
  await page.waitForTimeout(4000);
  expect(polls).toBe(before);
  const stranger = await browser.newContext({
    baseURL: 'http://127.0.0.1:3130',
  });
  try {
    await signInTestUser(
      stranger,
      `foreign-processing-${Date.now()}@example.com`,
    );
    for (const suffix of ['', '/transcript', '/notes'])
      expect(
        (await stranger.request.get(`/api/processing/${id}${suffix}`)).status(),
      ).toBe(404);
  } finally {
    await stranger.close();
  }
  await page.screenshot({
    path: test.info().outputPath('processing.png'),
    fullPage: true,
  });
});

test('unavailable processing stops polling and provider text renders safely', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(
    context,
    `notes-states-${Date.now()}@example.com`,
  );
  await post('/api/courses', { title: 'History' });
  await page.goto('/recordings');
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('History lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'history.wav',
    mimeType: 'audio/wav',
    buffer: sample(),
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  const card = page.getByRole('article', {
    name: 'History lecture',
    exact: true,
  });
  await expect(card).toBeVisible();
  let calls = 0;
  await page.route('**/api/processing/*', async (route) => {
    calls++;
    await route.fulfill({
      json: {
        status: 'unavailable',
        language: null,
        transcriptAvailable: false,
        notesAvailable: false,
        errorCode: '',
        deferred: false,
        updatedAt: null,
      },
    });
  });
  await card.getByText('Transcript and notes', { exact: true }).click();
  await expect(card).toContainText('Notes are unavailable for this recording.');
  await page.waitForTimeout(4000);
  expect(calls).toBe(1);
  await card.getByText('Transcript and notes', { exact: true }).click();
  await page.unroute('**/api/processing/*');
  await page.route('**/api/processing/**', async (route) => {
    const available = {
      available: true,
      language: 'ko',
      provider: 'fixture',
      model: 'synthetic',
    };
    const url = route.request().url();
    if (url.endsWith('/notes'))
      return route.fulfill({
        json: {
          ...available,
          data: {
            overview: '<img src=x onerror=alert(1)>',
            key_concepts: ['한국어 강의'],
            examples: [],
            review_questions: [],
            unclear_passages: ['Some audio was unclear.'],
          },
        },
      });
    if (url.endsWith('/transcript'))
      return route.fulfill({
        json: {
          ...available,
          data: {
            text: '<script>alert(1)</script>',
            segments: [{ start: 0, end: 1, text: '<script>alert(1)</script>' }],
          },
        },
      });
    return route.fulfill({
      json: {
        status: 'completed',
        language: 'ko',
        transcriptAvailable: true,
        notesAvailable: true,
        errorCode: '',
        deferred: false,
        updatedAt: new Date().toISOString(),
      },
    });
  });
  await card.getByText('Transcript and notes', { exact: true }).click();
  await expect(
    card.getByRole('region', { name: 'Lecture notes' }),
  ).toContainText('<img src=x onerror=alert(1)>');
  await expect(card.locator('img,script')).toHaveCount(0);
  await expect(
    card.getByRole('region', { name: 'Lecture notes' }),
  ).toHaveAttribute('lang', 'ko');
  await expect(card).toContainText('Some audio was unclear.');
});
