export function formatDate(dateStr?: Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}
