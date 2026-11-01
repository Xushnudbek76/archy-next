import type { AcademicOverview } from '@/libs/types/academics';

export function TimetableSelector({
  data,
  value,
  onChange,
  disabled = false,
}: {
  data: AcademicOverview;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="timetable-selector">
      <span>Timetable</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Choose a timetable</option>
        {data.terms.map((term) => (
          <optgroup
            key={term.id}
            label={`${term.name}${term.archivedAt ? ' · Archived' : ''}`}
          >
            {data.timetables
              .filter((table) => table.termId === term.id)
              .map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                  {table.isPrimary ? ' · Primary' : ''}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
