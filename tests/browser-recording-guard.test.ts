import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  installRecordingLeaveGuard,
  type LeaveGuardEnvironment,
} from '../libs/components/recordings/recording-leave-guard.ts';

function fixture(accept = false) {
  const page = new EventTarget();
  const links = new EventTarget();
  let restored = 0;
  let prompts = 0;
  const environment: LeaveGuardEnvironment = {
    page,
    links,
    url: 'https://archy.test/documents/lecture',
    restore: () => {
      restored++;
    },
    confirm: () => {
      prompts++;
      return accept;
    },
  };
  return {
    environment,
    page,
    links,
    restored: () => restored,
    prompts: () => prompts,
  };
}

test('unsaved audio blocks unload and removes the guard on cleanup', () => {
  const f = fixture();
  const cleanup = installRecordingLeaveGuard(f.environment);
  const event = new Event('beforeunload', { cancelable: true });
  f.page.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  cleanup();
  assert.equal(
    f.page.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    true,
  );
});

test('cancelling browser back restores the current document before routing', () => {
  const f = fixture();
  const cleanup = installRecordingLeaveGuard(f.environment);
  f.page.dispatchEvent(new Event('popstate'));
  assert.equal(f.restored(), 1);
  assert.equal(f.prompts(), 1);
  cleanup();
});

test('Navigation API blocks rejected same-document navigation without restoring history', () => {
  const f = fixture();
  f.environment.navigation = new EventTarget();
  const cleanup = installRecordingLeaveGuard(f.environment);
  const event = new Event('navigate', { cancelable: true });
  Object.assign(event, { destination: { sameDocument: true } });
  f.environment.navigation.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.restored(), 0);
  cleanup();
});

test('confirmed browser back proceeds once', () => {
  const f = fixture(true);
  const cleanup = installRecordingLeaveGuard(f.environment);
  f.page.dispatchEvent(new Event('popstate'));
  assert.equal(f.restored(), 0);
  assert.equal(f.prompts(), 1);
  cleanup();
});

class LinkFixture extends EventTarget {
  href = 'https://archy.test/courses';
  target = '';
  closest() {
    return this;
  }
  hasAttribute(name: string) {
    return name === 'download' && this.download;
  }
  download = false;
}

test('link clicks protect local audio but downloads, same-page anchors and new tabs stay usable', () => {
  const f = fixture();
  const link = new LinkFixture();
  f.environment.links = link;
  const cleanup = installRecordingLeaveGuard(f.environment);
  const click = () => {
    const event = new Event('click', { cancelable: true });
    Object.assign(event, { button: 0 });
    link.dispatchEvent(event);
    return event.defaultPrevented;
  };
  assert.equal(click(), true);
  link.download = true;
  assert.equal(click(), false);
  link.download = false;
  link.href = `${f.environment.url}#transcript`;
  assert.equal(click(), false);
  link.href = 'https://archy.test/courses';
  link.target = '_blank';
  assert.equal(click(), false);
  cleanup();
});

test('Next link clicks are blocked before routing even when Navigation API is available', () => {
  const f = fixture();
  const link = new LinkFixture();
  f.environment.links = link;
  f.environment.navigation = new EventTarget();
  const cleanup = installRecordingLeaveGuard(f.environment);
  const click = new Event('click', { cancelable: true });
  Object.assign(click, { button: 0 });
  link.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true);
  cleanup();
});

test('same-document hash navigation does not discard the recorder', () => {
  const f = fixture();
  f.environment.navigation = new EventTarget();
  const cleanup = installRecordingLeaveGuard(f.environment);
  const event = new Event('navigate', { cancelable: true });
  Object.assign(event, {
    destination: { sameDocument: true, url: `${f.environment.url}#transcript` },
  });
  f.environment.navigation.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(f.prompts(), 0);
  cleanup();
});
