import { sourceLabel, type StudySource } from '@/libs/types/study';
export function SourceLinks({
  ids,
  sources,
  onSelect,
}: {
  ids: string[];
  sources: StudySource[];
  onSelect: (source: StudySource) => void;
}) {
  return (
    <div aria-label="Sources">
      {ids.map((id) => {
        const source = sources.find((item) => item.id === id);
        return source ? (
          <button
            type="button"
            className="source-link"
            key={id}
            onClick={() => onSelect(source)}
          >
            {sourceLabel(source)}
          </button>
        ) : null;
      })}
    </div>
  );
}
