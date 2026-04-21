/** Atribuição de leads a funcionários: match por dígitos do número (como no HashAdmin). */

export function digitsOnly(s: string) {
  return (s || '').replace(/\D/g, '');
}

export function employeeIdForLead(
  leadNum: string | null,
  nums: { id: string; number: string }[],
): string | null {
  const a = digitsOnly(leadNum || '');
  if (!a) return null;
  for (const n of nums) {
    const b = digitsOnly(n.number);
    if (b && a === b) return n.id;
  }
  for (const n of nums) {
    const b = digitsOnly(n.number);
    if (b.length >= 9 && a.length >= 9 && a.slice(-9) === b.slice(-9)) return n.id;
  }
  return null;
}

export function isOrderPaid(payment_status: string, status: string) {
  return payment_status === 'paid' || status === 'pago';
}

export type EmployeeAggregate = { leads: number; pixPagos: number; receita: number };

export function aggregateEmployeeStats(
  numbers: { id: string; number: string }[],
  leadsRows: { numero_atribuido: string | null }[],
  ordersRows: {
    whatsapp_number_id: string | null;
    payment_status: string;
    status: string;
    valor_total: number;
  }[],
): Record<string, EmployeeAggregate> {
  const map: Record<string, EmployeeAggregate> = {};
  for (const n of numbers) {
    map[n.id] = { leads: 0, pixPagos: 0, receita: 0 };
  }
  for (const l of leadsRows) {
    const eid = employeeIdForLead(l.numero_atribuido, numbers);
    if (eid && map[eid]) map[eid].leads += 1;
  }
  for (const o of ordersRows) {
    if (!o.whatsapp_number_id || !map[o.whatsapp_number_id]) continue;
    if (isOrderPaid(o.payment_status, o.status)) {
      map[o.whatsapp_number_id].pixPagos += 1;
      map[o.whatsapp_number_id].receita += Number(o.valor_total || 0);
    }
  }
  return map;
}

export function labelForEmployeeId(
  id: string | null | undefined,
  numbers: { id: string; label: string }[],
): string {
  if (!id) return '—';
  return numbers.find((n) => n.id === id)?.label?.trim() || '—';
}
