export function seekTime(seconds: number, duration: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Number.isFinite(duration) && duration > 0
    ? Math.min(seconds, duration)
    : seconds;
}
export function adjacentTab(
  index: number,
  count: number,
  key: string,
): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index + count - 1) % count;
  return null;
}
