import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/libs/components/common/Brand';

const features = [
  {
    title: 'Start with your lecture materials',
    text: 'Keep your lecture PDF and recording together, ready whenever you need to review.',
  },
  {
    title: 'Keep the explanation in reach',
    text: 'Revisit recorded lectures, follow the transcript, and review the key ideas in your notes.',
  },
  {
    title: 'A clearer place to begin reviewing',
    text: 'Organize documents by course and return to the material that matters before your exam.',
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/en" aria-label="Archy home">
          <Brand />
        </Link>
        <nav aria-label="Website navigation">
          <a href="#features">Features</a>
          <Link href="/login?next=%2Fdocuments" className="primary-button">
            Get started
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <span className="landing-pill">
            A learning workspace for university students
          </span>
          <h1>
            One tap, and your lecture
            <br />
            turns into exam notes
          </h1>
          <p className="landing-lead">
            Less scrambling to write. More space to understand.
            <br />
            Keep your lectures, materials, and notes together with Archy.
          </p>
          <div className="landing-actions">
            <Link href="/login?next=%2Fdocuments" className="primary-button">
              Get started
            </Link>
            <a href="#features" className="secondary-button">
              Explore Archy
            </a>
          </div>
          <p className="landing-caption">
            Your study workspace, right in your browser.
          </p>
          <div className="product-preview">
            <Image
              src="/images/study-preview.jpg"
              width={1920}
              height={1200}
              alt="Archy study workspace preview with course material and organized notes"
              priority
            />
          </div>
        </section>
        <section className="landing-section" id="features">
          <h2>You do not have to chase the lecture.</h2>
          <p>
            A space for your materials, the explanation you want to revisit, and
            the notes you come back to before an exam.
          </p>
          <div className="landing-grid">
            {features.map((feature, index) => (
              <article className="landing-feature" key={feature.title}>
                <span className="landing-number">0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
        <div className="landing-band">
          <section className="landing-section landing-split">
            <div>
              <span className="landing-pill">FROM CLASS TO REVIEW</span>
              <h2>
                Start with the materials
                <br />
                you already have.
              </h2>
              <p>
                Bring a lecture PDF, an audio recording, or both. Give every
                document a home in its course folder.
              </p>
              <Link href="/login?next=%2Fdocuments" className="primary-button">
                Open your workspace
              </Link>
            </div>
            <Image
              src="/images/upload-preview.webp"
              width={828}
              height={620}
              alt="Preview of adding lecture materials to Archy"
            />
          </section>
        </div>
        <section className="landing-section">
          <h2>
            Be present while listening.
            <br />
            Come back when you need it.
          </h2>
          <div className="landing-grid">
            <article className="landing-feature">
              <h3>During class</h3>
              <p>
                Save the recording so you can focus on following the
                explanation.
              </p>
            </article>
            <article className="landing-feature">
              <h3>After class</h3>
              <p>
                Keep your slides and recording together. Reopen the original
                source whenever a concept needs another look.
              </p>
            </article>
            <article className="landing-feature">
              <h3>Before the exam</h3>
              <p>
                Find the right course, reopen your notes, and begin with the
                ideas you want to revisit.
              </p>
            </article>
          </div>
        </section>
        <section className="landing-closing">
          <h2>Make room for understanding.</h2>
          <p>From class materials to a calmer review routine.</p>
          <Link className="primary-button" href="/signup?next=%2Fdocuments">
            Get started with Archy
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Brand />
          <p>© {new Date().getFullYear()} Archy. Made for your learning.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </nav>
      </footer>
    </div>
  );
}
