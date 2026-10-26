import {
  quizAnswers,
  type Quiz,
  type QuizAttempt,
} from '../../types/quizzes.ts';
export { quizAnswers } from '../../types/quizzes.ts';
export type QuizSession = {
  quiz: Quiz;
  index: number;
  answers: Record<string, number>;
  pending: boolean;
  error: string;
  attempt: QuizAttempt | null;
};
export function initialQuizSession(quiz: Quiz): QuizSession {
  return {
    quiz,
    index: 0,
    answers: {},
    pending: false,
    error: '',
    attempt: null,
  };
}
type Action =
  | { type: 'reset' }
  | { type: 'answer'; questionId: string; answer: number }
  | { type: 'move'; index: number }
  | { type: 'submitting' }
  | { type: 'failed'; quizId: string; error: string }
  | { type: 'completed'; quizId: string; attempt: QuizAttempt };
export function quizSessionReducer(
  state: QuizSession,
  action: Action,
): QuizSession {
  if (action.type === 'reset') return initialQuizSession(state.quiz);
  if (action.type === 'answer') {
    if (state.pending || state.attempt) return state;
    const question = state.quiz.questions.find(
      (q) => q.id === action.questionId,
    );
    if (
      !question ||
      !Number.isInteger(action.answer) ||
      action.answer < 0 ||
      action.answer >= question.options.length
    )
      return state;
    return {
      ...state,
      error: '',
      answers: { ...state.answers, [question.id]: action.answer },
    };
  }
  if (action.type === 'move')
    return !state.pending &&
      Number.isInteger(action.index) &&
      action.index >= 0 &&
      action.index < state.quiz.questions.length
      ? { ...state, index: action.index }
      : state;
  if (action.type === 'submitting') {
    try {
      quizAnswers(state.quiz, state.answers);
    } catch {
      return { ...state, error: 'Answer every question before submitting.' };
    }
    return state.pending || state.attempt
      ? state
      : { ...state, pending: true, error: '' };
  }
  if (action.quizId !== state.quiz.id) return state;
  if (action.type === 'failed')
    return { ...state, pending: false, error: action.error };
  return { ...state, pending: false, error: '', attempt: action.attempt };
}
