/**
 * Normaliza resposta PIX da FastSoft / white-label (Fluxxopay).
 * O campo pix.qrcode às vezes vem como BR Code (EMV) e às vezes como imagem base64 —
 * usar o errado no QRCodeSVG quebra o pagamento no app do banco (comum no mobile).
 */

function isBrPixEmv(s) {
  const t = String(s || '').trim();
  return t.startsWith('000201');
}

function toImageDataUrl(qrcode) {
  const q = String(qrcode || '').trim();
  if (!q) return null;
  if (q.startsWith('data:image')) return q;
  if (q.startsWith('iVBOR')) return `data:image/png;base64,${q}`;
  if (q.startsWith('/9j/')) return `data:image/jpeg;base64,${q}`;
  return null;
}

/**
 * @param {object} txData - data da transação (ex.: response.data)
 * @returns {{ pix_copy_paste: string | null, pix_qr_code: string | null, pix_qr_code_url: string | null }}
 */
function normalizePixFields(txData) {
  const pix = txData?.pix || {};
  const q = pix.qrcode != null ? String(pix.qrcode).trim() : '';
  const url = pix.url != null ? String(pix.url).trim() : '';

  const extraKeys = ['copyPaste', 'copyAndPaste', 'payload', 'qrCode', 'brCode'];
  let brCode = null;
  for (const k of extraKeys) {
    const v = pix[k];
    if (v != null && isBrPixEmv(v)) {
      brCode = String(v).trim();
      break;
    }
  }
  if (!brCode && isBrPixEmv(q)) brCode = q;
  if (!brCode && isBrPixEmv(url)) brCode = url;

  const qrImageDataUrl = !brCode ? toImageDataUrl(q) : null;
  const httpQrUrl = url.startsWith('http') ? url : null;

  let pix_copy_paste =
    brCode ||
    (!qrImageDataUrl && q && !q.startsWith('http') ? q : null) ||
    (httpQrUrl && !qrImageDataUrl ? url : null) ||
    null;

  return {
    pix_copy_paste,
    pix_qr_code: q || null,
    pix_qr_code_url: qrImageDataUrl || httpQrUrl || null,
    _brCodeForQr: brCode,
  };
}

module.exports = { normalizePixFields, isBrPixEmv };
