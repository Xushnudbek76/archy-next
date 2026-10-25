import { documentId } from './documents.ts';
import {
  boundedText,
  isStudySource,
  object,
  type StudySource,
} from './study.ts';
export type Conversation = {
  id: string;
  documentId: string;
  title: string;
  createdAt: string;
};
export type TutorMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources: StudySource[];
  createdAt: string;
  provider: string | null;
};
export type ConversationDetail = Conversation & { messages: TutorMessage[] };
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export function isConversation(value: unknown): value is Conversation {
  return (
    object(value) &&
    documentId(value.id) &&
    documentId(value.documentId) &&
    boundedText(value.title, 200) &&
    date(value.createdAt)
  );
}
export function isTutorMessage(value: unknown): value is TutorMessage {
  return (
    object(value) &&
    documentId(value.id) &&
    ['user', 'assistant'].includes(String(value.role)) &&
    boundedText(value.text, 20000) &&
    date(value.createdAt) &&
    (value.provider === null || boundedText(value.provider, 32)) &&
    Array.isArray(value.sources) &&
    value.sources.length <= 6 &&
    value.sources.every(isStudySource)
  );
}
export function isConversationDetail(
  value: unknown,
): value is ConversationDetail {
  return (
    object(value) &&
    Array.isArray(value.messages) &&
    value.messages.length <= 200 &&
    value.messages.every(isTutorMessage) &&
    isConversation(value)
  );
}
export function tutorRoute(
  parts: string[],
  method: string,
): { path: string; method: string } | undefined {
  if (
    parts.length === 3 &&
    parts[0] === 'documents' &&
    documentId(parts[1]) &&
    parts[2] === 'conversations' &&
    ['GET', 'POST'].includes(method)
  )
    return { path: `/v1/documents/${parts[1]}/conversations`, method };
  if (
    parts.length === 2 &&
    parts[0] === 'conversations' &&
    documentId(parts[1]) &&
    method === 'GET'
  )
    return { path: `/v1/conversations/${parts[1]}`, method };
}
