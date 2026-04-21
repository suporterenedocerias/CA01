/** Gera slug URL a partir do nome do estado (ex.: "São Paulo" → "sao-paulo") */
export function slugifyStateName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'estado';
}
