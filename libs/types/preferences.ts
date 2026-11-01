export type Profile = {
  displayName: string;
  email: string;
  university: string;
  department: string;
  uiLanguage: 'en' | 'ko';
  summaryLanguage: 'auto' | 'en' | 'ko';
  noteFormat: string;
};
export type NoteFormat = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  custom: boolean;
};
const short = (value: unknown, max: number): value is string =>
  typeof value === 'string' && Array.from(value).length <= max;
export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<Profile>;
  return (
    short(data.displayName, 100) &&
    short(data.email, 254) &&
    short(data.university, 100) &&
    short(data.department, 100) &&
    ['en', 'ko'].includes(data.uiLanguage ?? '') &&
    ['auto', 'en', 'ko'].includes(data.summaryLanguage ?? '') &&
    short(data.noteFormat, 36) &&
    data.noteFormat.length > 0
  );
}
export function isNoteFormats(
  value: unknown,
): value is { items: NoteFormat[] } {
  if (
    !value ||
    typeof value !== 'object' ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    value.items.length > 13
  )
    return false;
  return value.items.every(
    (item: Partial<NoteFormat> | null) =>
      item &&
      short(item.id, 36) &&
      !!item.id &&
      short(item.name, 60) &&
      !!item.name &&
      short(item.description, 300) &&
      short(item.instructions, 300) &&
      typeof item.custom === 'boolean',
  );
}
