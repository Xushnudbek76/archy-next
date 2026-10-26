import type {
  ProcessingStatus,
  TranscriptResult,
  NoteResult,
} from '../types/processing.ts';
export type ProcessingState = {
  id: string;
  status: ProcessingStatus | null;
  transcript: TranscriptResult | null;
  notes: NoteResult | null;
  error: string;
};
export function processingState(
  id: string,
  previous?: ProcessingState,
  update: Partial<Omit<ProcessingState, 'id'>> = {},
): ProcessingState {
  return {
    ...(previous?.id === id
      ? previous
      : { status: null, transcript: null, notes: null, error: '' }),
    ...update,
    id,
  };
}
