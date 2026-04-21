/** pct em % (ex: 6.99), fixa em R$ (ex: 2.29) */
export function calcLiquido(bruto: number, pct = 6.99, fixa = 2.29): number {
  return bruto * (1 - pct / 100) - fixa;
}

export function fmtBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
