import type { StudySource } from '../../types/study.ts';
export function sourcesForRevision(
  loaded: { revision: string; items: StudySource[] } | null,
  revision: string,
): StudySource[] {
  return loaded?.revision === revision ? loaded.items : [];
}
export function sourceDestination(source: StudySource, known: StudySource[]) {
  const current = known.find((item) => item.id === source.id);
  return {
    current: !!current,
    page: current?.kind === 'pdf' ? current.page : null,
    time: current?.kind === 'transcript' ? current.start : null,
  };
}
