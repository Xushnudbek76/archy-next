import { isApiLive } from '@/api/server';
import Link from 'next/link';
import { Icon } from '@/libs/components/common/Icon';

export async function Overview() {
  const connected = await isApiLive();

  return (
    <div className="page-content">
      <div className="overview-heading">
        <p className="eyebrow">A LITTLE SPACE TO THINK</p>
        <span
          className={`connection-status ${connected ? 'connected' : 'offline'}`}
          role="status"
        >
          <span />
          {connected ? 'Service connected' : 'Service unavailable'}
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <Icon name="spark" size={15} /> Learning, with a little more clarity
          </span>
          <h1>
            A clearer space
            <br />
            for every lecture.
          </h1>
          <p>
            Your courses, recordings, and ideas.
            <br />
            Together in one thoughtful workspace.
          </p>
          <Link href="/courses" className="primary-link">
            Explore your workspace <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-dot dot-one" />
          <div className="art-dot dot-two" />
          <div className="lecture-card">
            <span className="illustration-label">LECTURE NOTES</span>
            <div className="illustration-title">A moment of clarity</div>
            <div className="illustration-line wide" />
            <div className="illustration-line" />
            <div className="illustration-line short" />
            <div className="illustration-wave">
              {[14, 25, 19, 36, 46, 29, 19, 39, 27, 15, 25, 37, 21, 13].map(
                (height, index) => (
                  <i key={index} style={{ height }} />
                ),
              )}
            </div>
            <span className="illustration-check">
              <Icon name="check" size={13} />
            </span>
          </div>
        </div>
      </section>
      <section className="workspace-section" aria-labelledby="workspace-title">
        <div className="section-heading">
          <h2 id="workspace-title">Find your focus</h2>
          <span>A home for everything you learn</span>
        </div>
        <div className="feature-grid">
          <Link href="/courses" className="feature-card">
            <span className="feature-icon">
              <Icon name="book" size={24} />
            </span>
            <h3>Your courses</h3>
            <p>
              A place to organize your lectures
              <br className="desktop-break" /> and keep the bigger picture.
            </p>
            <span className="card-link">
              View courses <Icon name="arrow" size={17} />
            </span>
          </Link>
          <Link href="/recordings" className="feature-card">
            <span className="feature-icon audio-icon">
              <Icon name="audio" size={24} />
            </span>
            <h3>Your recordings</h3>
            <p>
              Keep the moments that matter
              <br className="desktop-break" /> close to your notes.
            </p>
            <span className="card-link">
              View recordings <Icon name="arrow" size={17} />
            </span>
          </Link>
        </div>
      </section>
      <div className="welcome-note">
        <span className="welcome-dot" />
        <p>Welcome to the beginning of your Archy workspace.</p>
        <span>Make room for what comes next.</span>
      </div>
    </div>
  );
}
