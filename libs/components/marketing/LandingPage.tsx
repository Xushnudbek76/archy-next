import Link from 'next/link';
import { Brand } from '@/libs/components/common/Brand';
import { Icon } from '@/libs/components/common/Icon';
import { PublicHeader } from './PublicHeader';
import { FeatureSections } from './FeatureSections';

export function LandingPage({
  demoAvailable = false,
}: {
  demoAvailable?: boolean;
}) {
  return (
    <div className="landing">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <span className="landing-pill">
            The best AI note-taker for university students
          </span>
          <h1>
            One tap, and your lecture
            <br />
            <span>turns into exam notes</span>
          </h1>
          <p className="landing-lead">
            No more all-night exam study.
            <br />
            Prepare for exams quickly and efficiently with Archy.
          </p>
          <div className="landing-actions">
            <Link href="/login?next=%2Fdashboard" className="primary-button">
              Get started <Icon name="arrow" size={18} />
            </Link>
            {demoAvailable ? (
              <Link href="/demo" className="secondary-button">
                Try the demo
              </Link>
            ) : (
              <a href="#features" className="secondary-button">
                Explore Archy
              </a>
            )}
          </div>
          <p className="landing-caption">
            From your first lecture to your final review.
          </p>
          <a
            className="landing-scroll"
            href="#features"
            aria-label="Explore features"
          >
            <Icon name="chevron" size={20} />
          </a>
        </section>
        <FeatureSections />
        <section className="landing-closing">
          <p className="landing-eyebrow">Get started now</p>
          <h2>Make room for understanding.</h2>
          <p>From class notes to exam prep, do it all with Archy.</p>
          <Link href="/signup?next=%2Fdashboard" className="primary-button">
            Get started with Archy <Icon name="arrow" size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Brand />
          <p>© {new Date().getFullYear()} Archy. Made for your learning.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/features">Features</Link>
          <Link href="/help">Help</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </footer>
    </div>
  );
}
