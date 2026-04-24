/**
 * Normaliza resposta PIX — suporta Koliseu e outros gateways.
 * Tenta múltiplos campos possíveis para extrair o EMV BR Code e a imagem QR.
 */

function isBrPixEmv(s) {
  return String(s || '').trim().startsWith('000201');
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
 * @param {object} txData - objeto da transação (root ou data da resposta)
 * @returns {{ pix_copy_paste: string|null, pix_qr_code: string|null, pix_qr_code_url: string|null, _brCodeForQr: string|null }}
 */
function normalizePixFields(txData) {
  const pix = txData?.pix || {};

  // Candidatos ao EMV BR Code (copy-paste / geração de QR)
  const emvCandidates = [
    txData?.pixCode,
    txData?.pixCopyPaste,
    txData?.copyPaste,
    txData?.brCode,
    txData?.emvCode,
    txData?.qrCode,
    pix.qrcode,
    pix.copyPaste,
    pix.copyAndPaste,
    pix.payload,
    pix.brCode,
    pix.qrCode,
  ].filter(Boolean);

  let brCode = null;
  for (const v of emvCandidates) {
    if (isBrPixEmv(v)) { brCode = String(v).trim(); break; }
  }

  // Candidatos a imagem QR (base64)
  const qrImageCandidates = [
    txData?.pixQrCode,
    txData?.qrCodeBase64,
    txData?.qrCodeImage,
    pix.qrcode,
  ].filter(Boolean);

  let qrImageDataUrl = null;
  for (const v of qrImageCandidates) {
    const img = toImageDataUrl(v);
    if (img) { qrImageDataUrl = img; break; }
  }

  // Candidatos a URL HTTP do QR
  const urlCandidates = [
    txData?.qrCodeUrl,
    txData?.pixUrl,
    pix.url,
  ].filter(Boolean);
  const httpQrUrl = urlCandidates.find(u => String(u).startsWith('http')) || null;

  const rawFallback = emvCandidates[0] || qrImageCandidates[0] || null;

  return {
    pix_copy_paste: brCode || null,
    pix_qr_code: rawFallback ? String(rawFallback) : null,
    pix_qr_code_url: qrImageDataUrl || httpQrUrl || null,
    _brCodeForQr: brCode,
  };
}

module.exports = { normalizePixFields, isBrPixEmv };
