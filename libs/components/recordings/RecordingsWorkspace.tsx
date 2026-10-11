'use client';
import { useRecordings } from '@/libs/hooks/useRecordings';
import { useUpload } from '@/libs/hooks/useUpload';
import { UploadForm } from './UploadForm';
import { RecordingCard } from './RecordingCard';
import { PendingUpload } from './PendingUpload';

export function RecordingsWorkspace() {
  const list = useRecordings();
  const upload = useUpload(() => list.refresh(1, 1));
  const percent = Math.min(
    100,
    Math.floor((upload.progress / upload.total) * 100),
  );
  return (
    <section className="page-content">
      <p className="eyebrow">KEEP THE MOMENTS THAT MATTER</p>
      <h1>Your recordings</h1>
      <p className="page-intro">
        Keep your lectures together, ready when you need them.
      </p>
      <UploadForm pending={upload.pending} onUpload={upload.start} />
      {upload.error ? (
        <p className="course-error" role="alert" aria-label="Upload error">
          {upload.error}
        </p>
      ) : null}
      {upload.phase !== 'idle' && upload.phase !== 'done' ? (
        <div className="upload-progress" aria-live="polite">
          <p role="status">
            {upload.phase === 'hashing'
              ? 'Checking audio file'
              : upload.phase === 'finishing'
                ? 'Verifying audio'
                : upload.phase === 'paused'
                  ? 'Upload paused'
                  : 'Uploading audio'}
            {upload.phase === 'hashing' || upload.phase === 'uploading'
              ? ` · ${percent}%`
              : ''}
          </p>
          <progress
            aria-label={
              upload.phase === 'hashing'
                ? 'File check progress'
                : 'Upload progress'
            }
            max={upload.total}
            value={upload.progress}
          />
          {upload.pending && upload.phase !== 'finishing' ? (
            <button className="course-button" onClick={upload.pause}>
              Pause upload
            </button>
          ) : null}
          {upload.canResume ? (
            <button
              className="course-button"
              onClick={() => void upload.resumeCurrent()}
            >
              Continue upload
            </button>
          ) : null}
        </div>
      ) : upload.phase === 'done' ? (
        <p role="status" className="recording-success">
          Audio uploaded.
        </p>
      ) : null}
      <div className="section-heading">
        <h2>Saved lectures</h2>
        <button
          className="course-button"
          disabled={list.loading || upload.pending}
          onClick={() => list.refresh()}
        >
          Refresh recordings
        </button>
      </div>
      {list.loading ? (
        <p role="status">Loading recordings…</p>
      ) : list.error ? (
        <div>
          <p className="course-error" role="alert">
            {list.error}
          </p>
          <button className="course-button" onClick={() => list.refresh()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {list.uploads?.items.length ? (
            <section
              aria-label="Unfinished uploads"
              className="pending-uploads"
            >
              <h2>Unfinished uploads</h2>
              <p className="course-caption">
                Reselect the original file to continue from your saved progress.
              </p>
              <div className="course-grid">
                {list.uploads.items.map((item) => (
                  <PendingUpload
                    key={item.id}
                    upload={item}
                    disabled={upload.pending}
                    onResume={upload.resume}
                    onCancel={upload.cancel}
                  />
                ))}
              </div>
              {list.query.uploadPage > 1 || list.uploads.nextPage ? (
                <div className="course-pagination">
                  <button
                    className="course-button"
                    disabled={list.query.uploadPage === 1}
                    onClick={() =>
                      list.refresh(list.query.page, list.query.uploadPage - 1)
                    }
                  >
                    Previous uploads
                  </button>
                  <button
                    className="course-button"
                    disabled={!list.uploads.nextPage}
                    onClick={() =>
                      list.refresh(list.query.page, list.uploads!.nextPage!)
                    }
                  >
                    More uploads
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
          {list.recordings?.total === 0 ? (
            <div className="empty-state course-empty">
              <h2>No recordings yet</h2>
              <p>Upload your first lecture to keep it with your course.</p>
            </div>
          ) : (
            <div className="course-grid">
              {list.recordings?.items.map((item) => (
                <RecordingCard key={item.id} recording={item} />
              ))}
            </div>
          )}
          {list.query.page > 1 || list.recordings?.nextPage ? (
            <div className="course-pagination" aria-label="Recording pages">
              <button
                className="course-button"
                disabled={list.query.page === 1}
                onClick={() => list.refresh(list.query.page - 1)}
              >
                Previous
              </button>
              <span>Page {list.query.page}</span>
              <button
                className="course-button"
                disabled={!list.recordings?.nextPage}
                onClick={() => list.refresh(list.recordings!.nextPage!)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
