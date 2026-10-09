export type IconName =
  'grid' | 'book' | 'audio' | 'settings' | 'arrow' | 'spark' | 'check';

const paths: Record<IconName, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M13 7a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 2',
  audio: 'M4 10v4 M8 6v12 M12 3v18 M16 6v12 M20 10v4',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  spark: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  check: 'M5 12l4 4L19 6',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
