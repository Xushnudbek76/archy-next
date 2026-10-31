import { demoAvailable } from '@/api/demo';
import type { Metadata } from 'next';
import { LandingPage } from '@/libs/components/marketing/LandingPage';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'Archy — From lecture materials to clearer notes',
  description:
    'Keep lecture PDFs, recordings, transcripts and notes together in one private course workspace.',
};
export const dynamic = 'force-dynamic';
export default async function PublicHomePage() {
  return <LandingPage demoAvailable={await demoAvailable()} />;
}
