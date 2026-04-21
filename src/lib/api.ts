import { resolveApiBase } from '@/lib/resolve-api-base';

export async function apiGet<T = any>(endpoint: string): Promise<T> {
  const base = resolveApiBase();
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const res = await fetch(`${base}/${path}`);
  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Erro na API: ${res.status}`);
  }
  return data as T;
}

export async function apiPost<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  const base = resolveApiBase();
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const res = await fetch(`${base}/${path}`, {
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
