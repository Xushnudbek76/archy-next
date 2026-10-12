import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { signInTestUser } from './helpers';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function wav(seconds = 1, rate = 8000) {
  const size = seconds * rate;
  const bytes = Buffer.alloc(44 + size, 128);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + size, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate, 28);
  bytes.writeUInt16LE(1, 32);
  bytes.writeUInt16LE(8, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(size, 40);
  return bytes;
}

test('new audio limits reject long files and allow a fresh browser recording', async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.REAL_API,
    'Duration policy uses the real probe and database',
  );
  const post = await signInTestUser(
    context,
    `duration-${Date.now()}@example.com`,
  );
  expect((await post('/api/courses', { title: 'Physics' })).status()).toBe(201);
  await page.goto('/recordings');
  await expect(
    page.getByText('Up to 20 minutes for new uploads.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Recording title', { exact: true }).fill('Too long');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'lecture.wav',
    mimeType: 'audio/wav',
    buffer: wav(1202, 1000),
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Upload error' })).toContainText(
    'start a new upload',
  );
  await expect(
    page.getByRole('button', { name: 'Resume upload', exact: true }),
  ).toHaveCount(0);
  expect(
    (await (await context.request.get('/api/uploads')).json()).items,
  ).toHaveLength(0);
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Browser recording');
  const media = fileURLToPath(
    new URL(
      '../../archy-api/tests/fixtures/mediarecorder.webm',
      import.meta.url,
    ),
  );
  await page.getByLabel('Audio file', { exact: true }).setInputFiles(media);
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Browser recording', exact: true }),
  ).toBeVisible();
  const records = (await (await context.request.get('/api/recordings')).json())
    .items;
  expect(records).toHaveLength(1);
  expect(records[0].durationSeconds).toBeGreaterThan(0.8);
});

test('legacy hours-long audio resumes after a lost response, persists, seeks and stays private', async ({
  page,
  context,
  browser,
}) => {
  const post = await signInTestUser(
    context,
    `lecture-${Date.now()}@example.com`,
  );
  expect((await post('/api/courses', { title: 'Physics' })).status()).toBe(201);
  await page.goto('/recordings');
  await expect(
    page.getByRole('heading', { name: 'No recordings yet' }),
  ).toBeVisible();
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Three-hour lecture');
  test.setTimeout(120000);
  const bytes = wav(3 * 3600, 8000);
  const audioFile = test.info().outputPath('lecture.wav');
  const wrongFile = test.info().outputPath('wrong', 'lecture.wav');
  await writeFile(audioFile, bytes);
  await mkdir(dirname(wrongFile), { recursive: true });
  await page.getByLabel('Audio file', { exact: true }).setInputFiles(audioFile);
  let interrupted = false;
  await page.route('**/api/uploads/*/chunks', async (route) => {
    if (interrupted) return route.continue();
    interrupted = true;
    const saved = await route.fetch();
    expect(saved.status()).toBe(200);
    await route.abort('connectionreset');
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Upload error' })).toContainText(
    'interrupted',
  );
  const pending = page.getByRole('article', {
    name: 'Pending Three-hour lecture',
    exact: true,
  });
  if (process.env.REAL_API) {
    const list = await (await context.request.get('/api/uploads')).json();
    const backend = fileURLToPath(new URL('../../archy-api/', import.meta.url));
    execFileSync(
      `${backend}.venv-fastapi/bin/python`,
      ['-m', 'tests.seed_legacy_upload', list.items[0].id],
      { cwd: backend },
    );
  }
  await expect(pending).toContainText('4.0 MB');
  await page.unroute('**/api/uploads/*/chunks');
  await page.reload();
  await expect(pending).toBeVisible();
  if (process.env.REAL_API)
    await expect(pending).toContainText('Existing upload: no duration limit.');
  const wrong = Buffer.from(bytes);
  wrong[50] = 0;
  await writeFile(wrongFile, wrong);
  await pending.getByLabel('Reselect lecture.wav').setInputFiles(wrongFile);
  await pending
    .getByRole('button', { name: 'Resume upload', exact: true })
    .click();
  await expect(page.getByRole('alert', { name: 'Upload error' })).toContainText(
    'same audio file',
  );
  await expect(pending).toBeVisible();
  await pending.getByLabel('Reselect lecture.wav').setInputFiles(audioFile);
  await pending
    .getByRole('button', { name: 'Resume upload', exact: true })
    .click();
  const recording = page.getByRole('article', {
    name: 'Three-hour lecture',
    exact: true,
  });
  await expect(recording).toContainText('3h 0m');
  await expect(
    page.getByRole('heading', { name: 'Unfinished uploads', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(recording).toBeVisible();
  const list = await (await context.request.get('/api/recordings')).json();
  expect(list.total).toBe(1);
  const audioPath = `/api/recordings/${list.items[0].id}/audio`;
  const range = await context.request.get(audioPath, {
    headers: { Range: 'bytes=44-99' },
  });
  expect(range.status()).toBe(206);
  expect(await range.body()).toEqual(bytes.subarray(44, 100));
  for (const header of ['invalid', 'bytes=0-4,8-12']) {
    const full = await context.request.get(audioPath, {
      headers: { Range: header },
    });
    expect(full.status()).toBe(200);
    expect(full.headers()['content-range']).toBeUndefined();
    expect((await full.body()).equals(bytes)).toBe(true);
  }
  const head = await context.request.head(audioPath, {
    headers: { Range: 'bytes=44-99' },
  });
  expect(head.status()).toBe(200);
  expect(head.headers()['content-length']).toBe(String(bytes.length));
  expect((await head.body()).length).toBe(0);
  await recording
    .locator('audio')
    .evaluate((audio: HTMLAudioElement) => audio.load());
  await expect
    .poll(() =>
      recording
        .locator('audio')
        .evaluate((audio: HTMLAudioElement) => audio.duration),
    )
    .toBe(10800);
  await recording.locator('audio').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = 5400;
  });
  await expect
    .poll(() =>
      recording
        .locator('audio')
        .evaluate((audio: HTMLAudioElement) => audio.seeking),
    )
    .toBe(false);
  expect(
    await recording
      .locator('audio')
      .evaluate((audio: HTMLAudioElement) => audio.currentTime),
  ).toBeCloseTo(5400, 0);
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:3130' });
  try {
    await signInTestUser(other, `foreign-lecture-${Date.now()}@example.com`);
    expect((await other.request.get(audioPath)).status()).toBe(404);
    expect(
      (await (await other.request.get('/api/recordings')).json()).total,
    ).toBe(0);
  } finally {
    await other.close();
  }
  await page.screenshot({
    path: test.info().outputPath('recordings-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('recordings-mobile.png'),
    fullPage: true,
  });
});

test('temporary chunk overload retries without losing the recording', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(context, `retry-${Date.now()}@example.com`);
  await post('/api/courses', { title: 'Physics' });
  await page.goto('/recordings');
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Retry lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'lecture.wav',
    mimeType: 'audio/wav',
    buffer: wav(),
  });
  let attempts = 0;
  await page.route('**/api/uploads/*/chunks', async (route) => {
    if (++attempts <= 2)
      return route.fulfill({
        status: 429,
        headers: { 'Retry-After': '2', 'Content-Type': 'application/json' },
        body: '{"code":"rate_limited","message":"Busy"}',
      });
    return route.continue();
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Retry lecture', exact: true }),
  ).toBeVisible({ timeout: 20000 });
  expect(attempts).toBe(3);
});

test('a slow progressing upload survives the former total deadlines', async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.REAL_API,
    'Slow transport proof uses the actual backend.',
  );
  test.setTimeout(300000);
  const post = await signInTestUser(context, `slow-${Date.now()}@example.com`);
  await post('/api/courses', { title: 'Physics' });
  await page.goto('/recordings');
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Slow lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'lecture.wav',
    mimeType: 'audio/wav',
    buffer: wav(600),
  });
  const network = await context.newCDPSession(page);
  await network.send('Network.enable');
  await network.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: 24000,
  });
  try {
    await page
      .getByRole('button', { name: 'Upload audio', exact: true })
      .click();
    await expect(
      page.getByRole('article', { name: 'Slow lecture', exact: true }),
    ).toBeVisible({ timeout: 260000 });
  } finally {
    await network.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await network.detach();
  }
});

test('invalid audio is rejected and paused uploads can be discarded', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(
    context,
    `invalid-lecture-${Date.now()}@example.com`,
  );
  expect((await post('/api/courses', { title: 'History' })).status()).toBe(201);
  await page.goto('/recordings');
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Invalid sample');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'not-audio.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('<html>invalid audio</html>'),
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Upload error' })).toContainText(
    'valid MP3',
  );
  expect(
    (await (await context.request.get('/api/recordings')).json()).total,
  ).toBe(0);
  await expect(
    page.getByRole('button', { name: 'Continue upload', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByLabel('Recording title', { exact: true })
    .fill('Paused lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'pause.wav',
    mimeType: 'audio/wav',
    buffer: wav(2 * 3600, 1000),
  });
  let requests = 0;
  await page.route('**/api/uploads/*/chunks', async (route) => {
    requests++;
    if (requests === 1) {
      const response = await route.fetch();
      await route.fulfill({ response });
    } else await route.abort('connectionreset');
  });
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  const pending = page.getByRole('article', {
    name: 'Pending Paused lecture',
    exact: true,
  });
  await expect(pending).toBeVisible();
  await pending
    .getByRole('button', { name: 'Cancel upload', exact: true })
    .click();
  await pending
    .getByRole('button', { name: 'Keep upload', exact: true })
    .click();
  await expect(pending).toBeVisible();
  await pending
    .getByRole('button', { name: 'Cancel upload', exact: true })
    .click();
  await pending
    .getByRole('button', { name: 'Discard upload', exact: true })
    .click();
  await expect(pending).toHaveCount(0);
  expect(
    (await (await context.request.get('/api/recordings')).json()).total,
  ).toBe(0);
});

test('a discarded file can be uploaded again with the same title', async ({
  page,
  context,
}) => {
  const post = await signInTestUser(
    context,
    `restart-lecture-${Date.now()}@example.com`,
  );
  expect((await post('/api/courses', { title: 'Biology' })).status()).toBe(201);
  await page.goto('/recordings');
  await page.getByLabel('Recording title', { exact: true }).fill('Lecture');
  await page.getByLabel('Audio file', { exact: true }).setInputFiles({
    name: 'lecture.wav',
    mimeType: 'audio/wav',
    buffer: wav(),
  });
  await page.route('**/api/uploads/*/chunks', (route) =>
    route.abort('connectionreset'),
  );
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  const pending = page.getByRole('article', {
    name: 'Pending Lecture',
    exact: true,
  });
  await expect(pending).toBeVisible();
  await pending
    .getByRole('button', { name: 'Cancel upload', exact: true })
    .click();
  await pending
    .getByRole('button', { name: 'Discard upload', exact: true })
    .click();
  await expect(pending).toHaveCount(0);
  await page.unroute('**/api/uploads/*/chunks');
  await page.getByRole('button', { name: 'Upload audio', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Lecture', exact: true }),
  ).toBeVisible();
  expect(
    (await (await context.request.get('/api/recordings')).json()).total,
  ).toBe(1);
});
