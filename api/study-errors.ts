export const studyErrors: Readonly<Record<string, string>> = {
  study_unavailable:
    'AI is not configured yet. Your original material is still available.',
  study_provider_unavailable:
    'The AI provider is temporarily unavailable. Try again later.',
  study_source_limit:
    'This material is too large for study generation. Split it into smaller documents.',
  study_sources_unavailable:
    'Add readable material or wait for the transcript before generating.',
  source_changed: 'The material changed. Reload it before generating again.',
  no_incorrect_answers:
    'Every answer was correct. There are no mistakes to retry.',
  invalid_answers: 'Answer every question before submitting.',
  attempt_limit:
    'This quiz has reached its attempt limit. Generate another quiz to keep practising.',
  invalid_provider_output: 'The AI response could not be validated. Try again.',
};
