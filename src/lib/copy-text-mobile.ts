/**
 * Copiar texto no mobile: iOS Safari costuma falhar com clipboard API em http://LAN.
 */
export async function copyTextMobileFriendly(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* tenta fallback */
    }
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.width = "1px";
  ta.style.height = "1px";
  ta.style.padding = "0";
  ta.style.border = "none";
  ta.style.outline = "none";
  ta.style.boxShadow = "none";
  ta.style.background = "transparent";
  document.body.appendChild(ta);

  const isIos =
    /ipad|iphone|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIos) {
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    ta.setSelectionRange(0, text.length);
  } else {
    ta.focus();
    ta.select();
  }

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }

  return ok;
}
