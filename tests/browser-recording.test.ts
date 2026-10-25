import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BrowserRecordingSession,
  chooseRecordingMime,
  microphoneError,
  type CaptureEnvironment,
  type Recorder,
} from '../libs/components/recordings/browser-capture.ts';

function fixture() {
  let now = 0;
  let stoppedTracks = 0;
  let ended: (() => void) | null = null;
  const track = {
    stop: () => stoppedTracks++,
    addEventListener: (_event: string, callback: () => void) => {
      ended = callback;
    },
    removeEventListener: () => {
      ended = null;
    },
  };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const recorder: Recorder = {
    state: 'inactive',
    mimeType: 'audio/webm;codecs=opus',
    ondataavailable: null,
    onstop: null,
    onerror: null,
    start() {
      this.state = 'recording';
    },
    pause() {
      this.state = 'paused';
    },
    resume() {
      this.state = 'recording';
    },
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({
        data: new Blob(['audio'], { type: this.mimeType }),
      });
      this.onstop?.();
    },
  };
  const environment: CaptureEnvironment = {
    secureContext: true,
    supported: true,
    supportsType: (type) => type.startsWith('audio/webm'),
    getStream: async () => stream,
    createRecorder: () => recorder,
    now: () => now,
  };
  const session = new BrowserRecordingSession(environment, () => {});
  return {
    session,
    recorder,
    environment,
    setTime: (value: number) => {
      now = value;
    },
    stoppedTracks: () => stoppedTracks,
    endTrack: () => ended?.(),
  };
}

test('negotiates a supported audio container and reports unsupported formats', () => {
  assert.equal(
    chooseRecordingMime((type) => type === 'audio/mp4'),
    'audio/mp4',
  );
  assert.equal(
    chooseRecordingMime(() => false),
    null,
  );
});

test('pause excludes wall time from the server recording limit', async () => {
  const f = fixture();
  await f.session.start(1200);
  f.setTime(10_000);
  f.session.pause();
  f.setTime(3_610_000);
  assert.equal(f.session.snapshot.elapsedMs, 10_000);
  f.session.resume();
  f.setTime(4_800_000);
  f.session.tick();
  assert.equal(f.session.snapshot.phase, 'stopped');
  assert.equal(f.session.snapshot.elapsedMs, 1_200_000);
  assert.equal(await f.session.snapshot.blob?.text(), 'audio');
  assert.equal(f.stoppedTracks(), 1);
  f.session.dispose();
});

test('unsupported or insecure capture never requests microphone permission', async () => {
  const f = fixture();
  f.environment.secureContext = false;
  f.environment.getStream = async () => {
    assert.fail('must not prompt');
  };
  await f.session.start(1200);
  assert.match(f.session.snapshot.error ?? '', /HTTPS|localhost/);
  assert.equal(f.session.snapshot.phase, 'idle');
});

test('permission denial and revoked microphone have actionable messages', async () => {
  const f = fixture();
  f.environment.getStream = async () => {
    throw new DOMException('Denied', 'NotAllowedError');
  };
  await f.session.start(1200);
  assert.match(f.session.snapshot.error ?? '', /permission/);
  assert.match(
    microphoneError(new DOMException('', 'NotFoundError')),
    /microphone/,
  );
  assert.match(
    microphoneError(new DOMException('', 'NotReadableError')),
    /another app/,
  );
});

test('dispose stops a stream granted after the component leaves', async () => {
  const f = fixture();
  let grant: ((stream: MediaStream) => void) | undefined;
  f.environment.getStream = () =>
    new Promise((resolve) => {
      grant = resolve;
    });
  const start = f.session.start(1200);
  f.session.dispose();
  grant?.({ getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream);
  await start;
  assert.equal(f.recorder.state, 'inactive');
});

test('memory guard stops capture while retaining the audio already captured', async () => {
  const f = fixture();
  await f.session.start(1200, 8);
  f.recorder.ondataavailable?.({ data: new Blob(['first']) });
  f.recorder.ondataavailable?.({ data: new Blob(['overflow']) });
  assert.equal(f.session.snapshot.phase, 'stopped');
  assert.match(f.session.snapshot.error ?? '', /memory/);
  assert.equal(await f.session.snapshot.blob?.text(), 'first');
  assert.equal(f.stoppedTracks(), 1);
  f.session.dispose();
});

test('discard cancels a pending permission request and permits a fresh recording', async () => {
  const f = fixture();
  let release: ((stream: MediaStream) => void) | undefined;
  let lateTracksStopped = 0;
  f.environment.getStream = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const pending = f.session.start(1200);
  f.session.discard();
  release?.({
    getTracks: () => [
      {
        stop: () => {
          lateTracksStopped++;
        },
      },
    ],
  } as unknown as MediaStream);
  await pending;
  assert.equal(lateTracksStopped, 1);
  assert.equal(f.session.snapshot.phase, 'idle');
  f.session.dispose();
});

test('revoked microphone stops capture and preserves flushed audio', async () => {
  const f = fixture();
  await f.session.start(1200);
  f.recorder.ondataavailable?.({ data: new Blob(['prefix']) });
  f.endTrack();
  assert.equal(f.session.snapshot.phase, 'stopped');
  assert.match(f.session.snapshot.error ?? '', /interrupted/);
  assert.equal(await f.session.snapshot.blob?.text(), 'prefixaudio');
  assert.equal(f.stoppedTracks(), 1);
  f.session.dispose();
});

test('recorder error waits for the final data event before constructing the Blob', async () => {
  const f = fixture();
  await f.session.start(1200);
  f.recorder.ondataavailable?.({ data: new Blob(['prefix']) });
  f.recorder.state = 'inactive';
  f.recorder.onerror?.();
  assert.equal(f.session.snapshot.phase, 'stopping');
  f.recorder.ondataavailable?.({ data: new Blob(['final']) });
  f.recorder.onstop?.();
  assert.equal(await f.session.snapshot.blob?.text(), 'prefixfinal');
  f.session.dispose();
});
