import type { Metadata } from 'next';
import { WorkspaceLayout } from '@/libs/components/layout/WorkspaceLayout';
import '@/styles/globals.css';

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
      <body>
        <WorkspaceLayout>{children}</WorkspaceLayout>
      </body>
    </html>
  );
}
