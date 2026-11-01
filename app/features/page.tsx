import Link from 'next/link';
import { PublicHeader } from '@/libs/components/marketing/PublicHeader';
import { FeatureSections } from '@/libs/components/marketing/FeatureSections';
import '@/styles/landing.css';
import '@/styles/public-pages.css';
export const metadata = { title: 'A workspace for your learning' };
export default function Page() {
  return (
    <main className="public-page">
      <PublicHeader />
      <header className="public-intro">
        <span className="eyebrow">From class to understanding</span>
        <h1>
          Less searching.
          <br />
          More studying.
        </h1>
        <p>
          Bring your timetable, materials, recordings, and study tools together.
        </p>
        <Link className="primary-button" href="/signup?next=%2Fdashboard">
          Create your workspace
        </Link>
      </header>
      <FeatureSections />
      <section className="public-detail-grid">
        <article>
          <h2>Your week, in one place</h2>
          <p>
            Build semester timetables, add class times, and open each course’s
            materials from your dashboard. Import a public Everytime timetable,
            review it, then save.
          </p>
        </article>
        <article>
          <h2>Study from the source</h2>
          <p>
            Read PDFs, replay audio, and move between transcripts, notes,
            quizzes, and tutor conversations with source links.
          </p>
        </article>
        <article>
          <h2>A workspace that stays yours</h2>
          <p>
            Organize and pin materials, choose a note format, and keep archived
            semesters available for review.
          </p>
        </article>
      </section>
      <Link className="text-link" href="/help">
        Read the getting started guide
      </Link>
    </main>
  );
}
