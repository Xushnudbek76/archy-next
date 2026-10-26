import {
  isQuizAttempt,
  type Quiz,
  type QuizAttempt,
} from '../../types/quizzes.ts';
export function quizScore(attempt: QuizAttempt) {
  return {
    correct: attempt.score,
    total: attempt.total,
    percent: Math.round((attempt.score * 100) / attempt.total),
    mistakes: attempt.total - attempt.score,
  };
}
export function quizResultRows(quiz: Quiz, attempt: QuizAttempt) {
  if (!isQuizAttempt(attempt, quiz))
    throw new Error('Quiz results are unavailable.');
  return quiz.questions.map((question) => {
    const result = attempt.results.find(
      (item) => item.questionId === question.id,
    )!;
    return {
      questionId: question.id,
      prompt: question.prompt,
      selected: question.options[result.answer]!,
      expected: question.options[result.correctAnswer]!,
      correct: result.correct,
      explanation: result.explanation,
      sourceIds: [...new Set(result.sourceIds)],
    };
  });
}
