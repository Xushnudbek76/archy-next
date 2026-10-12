import { ApiError, jsonRequest } from './json-client.ts';
import {
  isNoteResult,
  isProcessingStatus,
  isTranscriptResult,
} from '../libs/types/processing.ts';
function invalid(): never {
  throw new ApiError(
    503,
    'unavailable',
    'Lecture notes are temporarily unavailable.',
  );
}
export async function readProcessing(id: string, signal: AbortSignal) {
  const value = await jsonRequest(
    `/api/processing/${id}`,
    undefined,
    undefined,
    {
      signal,
    },
  );
  return isProcessingStatus(value) ? value : invalid();
}
export async function readTranscript(id: string, signal: AbortSignal) {
  const value = await jsonRequest(
    `/api/processing/${id}/transcript`,
    undefined,
    undefined,
    { signal },
  );
  return isTranscriptResult(value) ? value : invalid();
}
export async function readNotes(id: string, signal: AbortSignal) {
  const value = await jsonRequest(
    `/api/processing/${id}/notes`,
    undefined,
    undefined,
    { signal },
  );
  return isNoteResult(value) ? value : invalid();
}
