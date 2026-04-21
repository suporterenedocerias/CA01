/**
 * Base da API de pagamento no browser.
 * Em dev no celular (IP da rede), .env com localhost quebra o fetch — força mesmo origin + proxy Vite.
 */
export function resolveApiBase(): string {
  if (typeof window === "undefined") {
    const env = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    return env && env !== "" ? env.replace(/\/$/, "") : "/api";
  }

  const origin = window.location.origin.replace(/\/$/, "");
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1";
  const envPointsToLoopback =
    !!raw &&
    (raw.includes("localhost") ||
      raw.includes("127.0.0.1") ||
      raw.includes("::1"));

  if (raw && envPointsToLoopback && !isLocalhost) {
    return `${origin}/api`;
  }

  if (!raw || raw === "/api") {
    return `${origin}/api`;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }

  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`.replace(/\/$/, "");
}
