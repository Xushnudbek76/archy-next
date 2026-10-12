import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('Provide an output WebM path');
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const bytes = await page.evaluate(async () => {
    const audio = new AudioContext();
    await audio.resume();
    const destination = audio.createMediaStreamDestination();
    const oscillator = audio.createOscillator();
    oscillator.connect(destination);
    oscillator.start();
    const recorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => parts.push(event.data);
    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start(100);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    recorder.stop();
    await finished;
    oscillator.stop();
    await audio.close();
    return Array.from(new Uint8Array(await new Blob(parts).arrayBuffer()));
  });
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(bytes));
  console.log('Captured browser WebM/Opus fixture.');
} finally {
  await browser.close();
}
