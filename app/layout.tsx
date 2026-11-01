import type { Metadata } from 'next';
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
