import Link from 'next/link';
import { PublicHeader } from '@/libs/components/marketing/PublicHeader';
import { InstallGuide } from '@/libs/components/marketing/InstallGuide';
import '@/styles/landing.css';
import '@/styles/public-pages.css';
export const metadata = { title: 'Help and getting started' };
const topics = [
  [
    'Set up your semester',
    'Open Timetable to create a semester and timetable. Add courses and meeting times. Choose a primary timetable for your dashboard; viewing another timetable does not change the primary.',
  ],
  [
    'Bring an Everytime timetable',
    'Use a public Everytime share link. Review the imported names and times before confirming. Private pages, screenshots, and OCR imports are not supported by this installation.',
  ],
  [
    'Upload a PDF',
    'Open Materials, choose a course folder, create a document, and upload a PDF from its study workspace. Scanned PDFs may have no readable text; OCR is not enabled.',
  ],
  [
    'Record a lecture',
    'Open Record and choose a course. Allow microphone access, then start recording. Pause and resume when needed. Stop to preview, then save. Stay on the page until the upload finishes.',
  ],
  [
    'Record on mobile',
    'Use HTTPS or localhost to allow microphone access. Keep Archy in the foreground: phones may suspend a microphone when the screen locks or another app opens. Archy shows a warning if capture is interrupted.',
  ],
  [
    'Review notes and practice',
    'Audio transcription and AI tools become available when this installation has an AI provider configured. Follow processing status in History, then open the study workspace. AI-generated notes can contain mistakes; check the linked source material.',
  ],
  [
    'Find older material',
    'Search History or Materials and filter by course. Pin important documents. Archived semesters remain readable, but new uploads and generation are disabled for them.',
  ],
  [
    'Choose languages and note formats',
    'Open Settings to save Korean or English interface preferences, the summary language, and a preset or custom note format. New jobs use your saved settings. Existing notes stay as they were.',
  ],
  [
    'Manage a plan',
    'Pricing and billing show this installation’s Toss test plans. A redirect alone never activates a plan: the server verifies the provider’s payment. Cancel renewal in Settings → Billing; access remains until the paid period ends.',
  ],
];
export default function Page() {
  return (
    <main className="public-page">
      <PublicHeader />
      <header className="public-intro">
        <span className="eyebrow">A good place to start</span>
        <h1>Make room for learning.</h1>
        <p>A few simple steps to get comfortable with Archy.</p>
        <Link className="primary-button" href="/dashboard">
          Open your workspace
        </Link>
      </header>
      <section className="help-topics" aria-label="Getting started">
        {topics.map(([title, body]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{body}</p>
          </details>
        ))}
      </section>
      <InstallGuide />
      <section className="help-footer">
        <h2>Trouble signing in?</h2>
        <p>
          Confirm your email before signing in, or request a password reset. If
          your account was created with a social provider, use the same
          provider.
        </p>
        <Link className="text-link" href="/forgot-password">
          Reset your password
        </Link>
      </section>
    </main>
  );
}
