'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
function displayMode() {
  return window.matchMedia('(display-mode: standalone)').matches;
}
function subscribeDisplayMode(update: () => void) {
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}

export function InstallGuide() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [pending, setPending] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    displayMode,
    () => false,
  );
  useEffect(() => {
    const offer = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);
  async function prompt() {
    if (!install || pending) return;
    setPending(true);
    try {
      await install.prompt();
      const choice = await install.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
    } finally {
      setInstall(null);
      setPending(false);
    }
  }
  return (
    <section className="help-install" id="install">
      <div>
        <span className="eyebrow">Keep Archy close</span>
        <h2>Add it to your home screen.</h2>
        <p>
          Open your workspace in its own window, with the same account and saved
          materials.
        </p>
      </div>
      <div>
        {installed || standalone ? (
          <p role="status">Archy is open as an installed app.</p>
        ) : install ? (
          <button
            className="primary-button"
            disabled={pending}
            onClick={() => void prompt()}
          >
            {pending ? 'Opening…' : 'Install Archy'}
          </button>
        ) : (
          <>
            <h3>iPhone or iPad</h3>
            <p>Open Archy in Safari, tap Share, then Add to Home Screen.</p>
            <h3>Android or desktop</h3>
            <p>
              Open your browser menu and choose Install app or Add to Home
              Screen, when available.
            </p>
          </>
        )}
        <p className="muted">
          An internet connection is needed for your private workspace. Materials
          are not saved for offline access.
        </p>
      </div>
    </section>
  );
}
