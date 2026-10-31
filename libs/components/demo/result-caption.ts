export function resultCaption(provider: string): string {
  if (provider === 'demo')
    return 'Hand-written sample content. No live AI request was made.';
  if (provider === 'fixture')
    return 'Synthetic test fixture. Not a live AI result.';
  return 'AI-generated from this material. Check important details against the original sources.';
}
