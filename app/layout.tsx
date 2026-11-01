import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/libs/i18n/LanguageProvider';
import 'pretendard/dist/web/variable/pretendardvariable.css';
import '@/styles/globals.css';
import '@/styles/auth.css';
import '@/styles/courses.css';
import '@/styles/theme.css';
import '@/styles/workspace.css';
import '@/styles/study.css';
import '@/styles/tutor.css';
import '@/styles/quizzes.css';
import '@/styles/browser-recording.css';
import '@/styles/recordings.css';
import '@/styles/settings.css';

export const metadata: Metadata = {
  title: { default: 'Archy — Your lecture workspace', template: '%s | Archy' },
  description:
    'A clearer space for your courses, lecture recordings, and notes.',
  appleWebApp: { capable: true, title: 'Archy', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const language =
    (await cookies()).get('archy_language')?.value === 'ko' ? 'ko' : 'en';
  return (
    <html lang={language}>
      <body>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
