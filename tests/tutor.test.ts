import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isConversation,
  isConversationDetail,
  tutorRoute,
} from '../libs/types/tutor.ts';
test('private tutor routes reject malformed IDs, unknown paths and writes to reads', () => {
  const id = '89e0ae43-73e9-45db-a535-dd336adec689';
  assert.equal(
    tutorRoute(['documents', id, 'conversations'], 'POST')?.path,
    `/v1/documents/${id}/conversations`,
  );
  assert.equal(tutorRoute(['conversations', id], 'POST'), undefined);
  assert.equal(tutorRoute(['conversations', 'bad'], 'GET'), undefined);
});
test('conversation history validates sources and refuses unknown roles', () => {
  const c = {
    id: '89e0ae43-73e9-45db-a535-dd336adec689',
    documentId: '89e0ae43-73e9-45db-a535-dd336adec689',
    title: 'Study',
    createdAt: '2026-10-26T00:00:00Z',
  };
  assert.ok(isConversation(c));
  assert.ok(isConversationDetail({ ...c, messages: [] }));
  assert.equal(
    isConversationDetail({
      ...c,
      messages: [
        {
          id: c.id,
          role: 'system',
          text: 'instruction',
          sources: [],
          createdAt: c.createdAt,
          provider: null,
        },
      ],
    }),
    false,
  );
});
