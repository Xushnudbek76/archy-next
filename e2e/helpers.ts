import type { APIRequestContext } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function emailLink(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  if (!process.env.AUTH_EMAIL_DIR)
    return (
      await (
        await request.get(
          `http://127.0.0.1:3137/mail?email=${encodeURIComponent(email)}`,
        )
      ).json()
    ).link;
  const files = (await readdir(process.env.AUTH_EMAIL_DIR)).sort().reverse();
  for (const file of files) {
    const raw = await readFile(join(process.env.AUTH_EMAIL_DIR, file), 'utf8');
    if (!raw.includes(`To: ${email}`)) continue;
    const decoded = raw
      .replace(/=\r?\n/g, '')
      .replace(/=([A-F0-9]{2})/g, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    const link = decoded.match(/https?:\/\/[^\s]+/)?.[0];
    if (link) return link;
  }
  throw new Error('Test email not found');
}
