import { ApiError, jsonRequest } from './json-client.ts';
import {
  isConversation,
  isConversationDetail,
  type Conversation,
  type ConversationDetail,
} from '../libs/types/tutor.ts';
import { object } from '../libs/types/study.ts';
import { documentId } from '../libs/types/documents.ts';
function validId(id: string) {
  if (!documentId(id))
    throw new ApiError(400, 'invalid_request', 'Invalid conversation.');
  return id;
}
export async function conversations(
  id: string,
  signal?: AbortSignal,
): Promise<Conversation[]> {
  const value = await jsonRequest(
    `/api/tutor/documents/${validId(id)}/conversations`,
    undefined,
    'POST',
    { signal },
  );
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    !value.items.every(isConversation)
  )
    throw new ApiError(
      503,
      'invalid_response',
      'Unable to read conversations.',
    );
  return value.items;
}
export async function createConversation(id: string): Promise<Conversation> {
  const value = await jsonRequest(
    `/api/tutor/documents/${validId(id)}/conversations`,
    {},
  );
  if (!isConversation(value))
    throw new ApiError(
      503,
      'invalid_response',
      'Unable to open a conversation.',
    );
  return value;
}
export async function conversation(
  id: string,
  signal?: AbortSignal,
): Promise<ConversationDetail> {
  const value = await jsonRequest(
    `/api/tutor/conversations/${validId(id)}`,
    undefined,
    'POST',
    { signal },
  );
  if (!isConversationDetail(value))
    throw new ApiError(
      503,
      'invalid_response',
      'Unable to read the conversation.',
    );
  return value;
}
