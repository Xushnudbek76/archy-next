import Link from 'next/link';
import { Icon } from '@/libs/components/common/Icon';
import type { Document } from '@/libs/types/documents';
export function DocumentCard({ document }: { document: Document }) {
  return (
    <article className="document-card">
      <Link href={`/documents/${document.id}`} className="document-card-link">
        <div className={`document-cover ${document.hasPdf ? 'pdf-cover' : ''}`}>
          <Icon name={document.hasPdf ? 'book' : 'audio'} size={32} />
          <span>
            {document.hasPdf
              ? 'PDF material'
              : document.recordingId
                ? 'Lecture recording'
                : 'Study document'}
          </span>
        </div>
        <div className="document-card-copy">
          <h2>{document.title}</h2>
          <p>
            {document.hasPdf
              ? `${document.pageCount ?? ''} ${document.pageCount === 1 ? 'page' : 'pages'}`
              : 'Your lecture material'}
          </p>
          <time dateTime={document.updatedAt}>
            {new Date(document.updatedAt).toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
      </Link>
    </article>
  );
}
