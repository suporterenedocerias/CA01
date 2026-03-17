// Base URL da API Express — em dev usa proxy relativo, em prod o Nginx faz o proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiPost<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Erro na API: ${res.status}`);
  }

  return data as T;
}
