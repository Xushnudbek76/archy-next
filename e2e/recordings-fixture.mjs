import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
const uploads = new Map();
const recordings = new Map();
function publicUpload(upload) {
  const value = { ...upload };
  delete value.owner;
  delete value.parts;
  return value;
}
function publicRecording(recording) {
  const value = { ...recording };
  delete value.owner;
  delete value.data;
  return value;
}

export function recordingsFixture(
  request,
  response,
  user,
  courses,
  data,
  reply,
  fail,
  csrf,
) {
  const url = new URL(request.url, 'http://localhost');
  const parts = url.pathname.split('/');
  if (!['uploads', 'recordings'].includes(parts[2])) return false;
  if (!user) {
    fail(403);
    return true;
  }
  if (
    !['GET', 'HEAD'].includes(request.method) &&
    (request.headers.origin !== 'http://127.0.0.1:3130' ||
      !request.headers.cookie?.includes(`csrftoken=${csrf}`) ||
      request.headers['x-csrftoken'] !== csrf)
  ) {
    fail(403);
    return true;
  }
  const owner = user.profile.id;
  if (
    parts[2] === 'uploads' &&
    parts[3] === 'policy' &&
    request.method === 'GET'
  ) {
    reply(200, { maxDurationSeconds: 1200 });
    return true;
  }
  const page = Number(url.searchParams.get('page') ?? 1);
  const list = (items) =>
    reply(200, {
      items: items.slice((page - 1) * 20, page * 20),
      total: items.length,
      nextPage: page * 20 < items.length ? page + 1 : null,
    });
  if (parts[2] === 'recordings') {
    if (!parts[3]) {
      list(
        [...recordings.values()]
          .filter((r) => r.owner === owner)
          .reverse()
          .map(publicRecording),
      );
      return true;
    }
    const recording = recordings.get(parts[3]);
    if (!recording || recording.owner !== owner || parts[4] !== 'audio') {
      fail(404);
      return true;
    }
    const range =
      request.method === 'GET'
        ? request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
        : null;
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2]
      ? Math.min(Number(range[2]), recording.data.length - 1)
      : recording.data.length - 1;
    const body = recording.data.subarray(start, end + 1);
    const headers = {
      'Content-Type': 'audio/wav',
      'Content-Length': body.length,
      'Accept-Ranges': 'bytes',
    };
    if (range)
      headers['Content-Range'] =
        `bytes ${start}-${end}/${recording.data.length}`;
    response.writeHead(range ? 206 : 200, headers);
    response.end(body);
    return true;
  }
  if (!parts[3] && request.method === 'GET') {
    list(
      [...uploads.values()]
        .filter((u) => u.owner === owner && u.status === 'UPLOADING')
        .reverse()
        .map(publicUpload),
    );
    return true;
  }
  if (!parts[3] && request.method === 'POST') {
    const course = courses.get(data.courseId);
    if (!course || course.owner !== owner || course.archivedAt) {
      fail(404);
      return true;
    }
    if (uploads.has(data.id)) {
      reply(200, publicUpload(uploads.get(data.id)));
      return true;
    }
    const upload = {
      ...data,
      courseTitle: course.title,
      uploadedBytes: 0,
      status: 'UPLOADING',
      errorCode: '',
      chunkBytes: 4 * 1024 * 1024,
      maxDurationSeconds: 1200,
      recording: null,
      createdAt: new Date().toISOString(),
      owner,
      parts: [],
    };
    uploads.set(upload.id, upload);
    reply(201, publicUpload(upload));
    return true;
  }
  const upload = uploads.get(parts[3]);
  if (!upload || upload.owner !== owner) {
    fail(404);
    return true;
  }
  if (!parts[4] && request.method === 'GET') {
    reply(200, publicUpload(upload));
    return true;
  }
  if (parts[4] === 'cancel') {
    upload.status = 'CANCELLED';
    upload.parts = [];
    reply(200, publicUpload(upload));
    return true;
  }
  if (parts[4] === 'complete' && upload.status === 'ACCEPTED') {
    reply(200, publicUpload(upload));
    return true;
  }
  if (upload.status !== 'UPLOADING') {
    fail(409);
    return true;
  }
  if (parts[4] === 'chunks') {
    if (Number(request.headers['upload-offset']) !== upload.uploadedBytes) {
      fail(409);
      return true;
    }
    upload.parts.push(data);
    upload.uploadedBytes += data.length;
    reply(200, publicUpload(upload));
    return true;
  }
  if (parts[4] === 'complete') {
    const bytes = Buffer.concat(upload.parts);
    const valid =
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WAVE';
    const checksum = createHash('sha256').update(bytes).digest('hex');
    if (!valid || checksum !== upload.sha256) {
      upload.status = 'FAILED';
      upload.errorCode = valid ? 'checksum_mismatch' : 'invalid_audio';
      reply(400, { code: upload.errorCode, message: 'Invalid audio' });
      return true;
    }
    const recording = {
      id: upload.id,
      courseId: upload.courseId,
      courseTitle: upload.courseTitle,
      title: upload.title,
      sizeBytes: bytes.length,
      durationSeconds: bytes.readUInt32LE(40) / bytes.readUInt32LE(28),
      contentType: 'audio/wav',
      createdAt: new Date().toISOString(),
      owner,
      data: bytes,
    };
    recordings.set(recording.id, recording);
    upload.status = 'ACCEPTED';
    upload.recording = publicRecording(recording);
    upload.parts = [];
    reply(200, publicUpload(upload));
    return true;
  }
  fail(404);
  return true;
}
