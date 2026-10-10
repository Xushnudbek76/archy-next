import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/auth.css';
import '@/styles/courses.css';

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
