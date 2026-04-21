/** Valores e textos padrão da página (alinhados ao briefing comercial). */
export const DEFAULT_DUMPSTER_SIZES = [
  { id: 'static-3', size: '3m³', title: 'Pequenas obras', description: 'Ideal para reformas rápidas', price: 180, order_index: 1 },
  { id: 'static-4', size: '4m³', title: 'Reformas médias', description: 'Banheiro, cozinha', price: 260, order_index: 2 },
  { id: 'static-5', size: '5m³', title: 'Mais pedida', description: 'Perfeita para casa e apartamento', price: 340, order_index: 3 },
  { id: 'static-7', size: '7m³', title: 'Obras maiores', description: 'Construções em andamento', price: 460, order_index: 4 },
  { id: 'static-10', size: '10m³', title: 'Grandes projetos', description: 'Alto volume de entulho', price: 720, order_index: 5 },
  { id: 'static-15', size: '15m³', title: 'Volume máximo', description: 'Para grandes demandas', price: 930, order_index: 6 },
] as const;
