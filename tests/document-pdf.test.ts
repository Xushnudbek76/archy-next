import assert from 'node:assert/strict';
import test from 'node:test';
import { forwardPdfRequest } from '../api/document-pdf-proxy.ts';
const id = '11111111-1111-4111-8111-111111111111';
const config = {
  apiBaseUrl: 'https://api.test',
  appOrigin: 'https://archy.test',
};
const url = `https://archy.test/api/documents/${id}/pdf`;

test('PDF writes reject cross-origin requests and declared oversize bodies before forwarding', async () => {
  const headers = {
    'Content-Type': 'application/pdf',
    'X-File-Name': 'lecture.pdf',
    Cookie: 'sessionid=synthetic',
  };
  assert.equal(
    (
      await forwardPdfRequest(
        new Request(url, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://evil.test' },
          body: '%PDF-1.7',
        }),
        id,
        config,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await forwardPdfRequest(
        new Request(url, {
          method: 'POST',
          headers: {
            ...headers,
            Origin: config.appOrigin,
            'Content-Length': String(20 * 1024 * 1024 + 1),
          },
          body: '%PDF-1.7',
        }),
        id,
        config,
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await forwardPdfRequest(
        new Request(url + '?download=anything'),
        id,
        config,
      )
    ).status,
    400,
  );
});

test('private PDF reads stream safe headers and reject unexpected upstream content', async () => {
  const original = globalThis.fetch;
  try {
    let called = false;
    globalThis.fetch = async (input, options) => {
      called = true;
      assert.equal(
        String(input),
        'https://api.test/v1/documents/' + id + '/pdf',
      );
      assert.equal(
        new Headers(options?.headers).get('Cookie'),
        'sessionid=synthetic',
      );
      return new Response('%PDF-1.7', {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '8',
          'Content-Disposition': 'inline; filename="lecture.pdf"',
        },
      });
    };
    const response = await forwardPdfRequest(
      new Request(url, { headers: { Cookie: 'sessionid=synthetic' } }),
      id,
      config,
    );
    assert.equal(called, true);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '%PDF-1.7');
    assert.equal(response.headers.get('Content-Security-Policy'), 'sandbox');
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    globalThis.fetch = async () =>
      new Response('<script>bad</script>', {
        headers: { 'Content-Type': 'text/html' },
      });
    assert.equal(
      (await forwardPdfRequest(new Request(url), id, config)).status,
      503,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('oversized PDFs give an actionable size error before requesting a CSRF token', async () => {
  const { uploadPdf, pdfError } = await import('../api/document-pdf-client.ts');
  const { ApiError } = await import('../api/json-client.ts');
  const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'lecture.pdf', {
    type: 'application/pdf',
  });
  await assert.rejects(
    () => uploadPdf(id, file, () => {}, new AbortController().signal),
    (cause) => cause instanceof ApiError && /20 MB/.test(pdfError(cause)),
  );
});

test('a slow private PDF body can finish after its headers arrive', async () => {
  const { createServer } = await import('node:http');
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/pdf' });
    response.write('%PDF-1.7\n');
    const timer = setTimeout(() => response.end('complete'), 11000);
    response.on('close', () => clearTimeout(timer));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await forwardPdfRequest(new Request(url), id, {
      ...config,
      apiBaseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.equal(await response.text(), '%PDF-1.7\ncomplete');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
