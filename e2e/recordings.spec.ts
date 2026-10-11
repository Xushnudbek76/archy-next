import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { signInTestUser } from './helpers';

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

test('hours-long audio resumes after a lost response, persists, seeks and stays private', async ({
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
  await expect(pending).toContainText('4.0 MB');
  await page.unroute('**/api/uploads/*/chunks');
  await page.reload();
  await expect(pending).toBeVisible();
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
