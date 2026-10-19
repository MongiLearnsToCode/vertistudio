export function timecode(seconds: number): string {
  const ms = Math.max(0, Math.round((seconds || 0) * 1000));
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
export function parseTimecode(text: string): number {
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(text.trim())) return NaN;
  const parts = text.trim().split(':').map(Number);
  if (parts.some((value, i) => i > 0 && value >= 60)) return NaN;
  return parts.reduce((sum, value) => sum * 60 + value, 0);
}
export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}
export function estimateBytes(duration: number, preset: string): number {
  const rates: Record<string, number> = { balanced: 3.928, quality: 6.592, master: 11.756 };
  return (duration * (rates[preset] ?? 6.592) * 1e6) / 8;
}
