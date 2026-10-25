import type { DocumentDetail } from '@/libs/types/documents';
export function PdfMaterial({
  document,
  page,
}: {
  document: DocumentDetail;
  page?: number;
}) {
  const source = `/api/documents/${document.id}/pdf`;
  return (
    <section className="document-material surface" aria-label="PDF material">
      <header className="material-heading">
        <div>
          <h2>Lecture material</h2>
          <p className="muted">
            {document.fileName} · {document.pageCount} pages
          </p>
        </div>
        <a
          className="secondary-button"
          href={source}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original PDF
        </a>
      </header>
      <iframe
        className="pdf-preview"
        src={page ? `${source}#page=${page}` : source}
        title={`PDF: ${document.title}`}
        referrerPolicy="no-referrer"
      />
      <details className="extracted-text">
        <summary>Read extracted text</summary>
        <p>
          Text is extracted from the PDF and may not preserve its original
          layout.
        </p>
        <div className="document-text">
          {document.text || 'No extracted text is available.'}
        </div>
      </details>
    </section>
  );
}
