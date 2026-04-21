/** Campos PIX normalizados a partir de um pedido (Supabase). */

export function isBrPixEmv(s: string | null | undefined): boolean {
  return Boolean(s && String(s).trim().startsWith("000201"));
}

export function getPixCopyText(order: {
  pix_copy_paste?: string | null;
  pix_qr_code?: string | null;
} | null): string {
  if (!order) return "";
  const paste = order.pix_copy_paste?.trim();
  if (paste) return paste;
  const qr = order.pix_qr_code?.trim();
  if (qr && isBrPixEmv(qr)) return qr;
  return "";
}

export function getBrCodeForQr(order: {
  pix_copy_paste?: string | null;
  pix_qr_code?: string | null;
} | null): string | null {
  if (!order) return null;
  if (isBrPixEmv(order.pix_copy_paste)) return String(order.pix_copy_paste).trim();
  if (isBrPixEmv(order.pix_qr_code)) return String(order.pix_qr_code).trim();
  return null;
}

export function getPixQrImageUrl(order: { pix_qr_code_url?: string | null } | null): string | null {
  const u = order?.pix_qr_code_url?.trim();
  return u || null;
}
