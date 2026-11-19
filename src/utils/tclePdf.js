import { Platform } from 'react-native';
import { TCLE_SECTIONS, TCLE_TITLE } from '../constants/tcleContent';

/** @param {string} value */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Gera o documento HTML formatado do TCLE / LGPD para impressão ou PDF. */
export function buildTcleHtml() {
  const sectionsHtml = TCLE_SECTIONS.map(
    section => `
      <section class="section">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n')}
      </section>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(TCLE_TITLE)}</title>
  <style>
    @page { margin: 20mm 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #15242B;
      line-height: 1.55;
      max-width: 740px;
      margin: 0 auto;
      padding: 24px 18px;
      background: #FFFFFF;
    }
    header {
      border-bottom: 2px solid #1D5D4F;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      background: #1D5D4F;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 20px;
      line-height: 1.3;
      color: #1D5D4F;
      margin: 0;
    }
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    h2 {
      font-size: 15px;
      color: #1D5D4F;
      margin: 0 0 6px 0;
    }
    p {
      font-size: 13px;
      margin: 0 0 8px 0;
      text-align: justify;
    }
    footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #D8E2E6;
      font-size: 11px;
      color: #4A5665;
    }
  </style>
</head>
<body>
  <header>
    <div class="badge">IP RISK — INVENTÁRIO PSICOSSOCIAL</div>
    <h1>${escapeHtml(TCLE_TITLE)}</h1>
  </header>
  ${sectionsHtml}
  <footer>
    Documento informativo gerado pelo aplicativo IP RISK (CESMAC / CITEC). Participação anônima e voluntária em conformidade com a LGPD (Lei nº 13.709/2018).
  </footer>
</body>
</html>`;
}

/** Abre ou compartilha o TCLE/LGPD em HTML/PDF, retornando `{ status: 'fallback' }` se indisponível. */
export async function openOrDownloadTcle() {
  const html = buildTcleHtml();

  if (Platform?.OS === 'web') {
    if (typeof window !== 'undefined') {
      try {
        const popup = window.open('', '_blank');
        if (popup && popup.document) {
          popup.document.open();
          popup.document.write(html);
          popup.document.close();
          popup.focus?.();
          popup.print?.();
          return { status: 'opened' };
        }
      } catch {
        // Tenta download direto caso o pop-up seja bloqueado.
      }

      try {
        if (typeof Blob !== 'undefined' && typeof document !== 'undefined' && typeof URL?.createObjectURL === 'function') {
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'TCLE-LGPD-IP-RISK.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return { status: 'downloaded' };
        }
      } catch {
        return { status: 'fallback' };
      }
    }
    return { status: 'fallback' };
  }

  try {
    const Print = require('expo-print');
    const Sharing = require('expo-sharing');
    if (typeof Print?.printToFileAsync !== 'function') {
      return { status: 'fallback' };
    }
    const { uri } = await Print.printToFileAsync({ html });
    const canShare = typeof Sharing?.isAvailableAsync === 'function' && await Sharing.isAvailableAsync();
    if (!canShare || typeof Sharing?.shareAsync !== 'function') {
      return { status: 'fallback' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: TCLE_TITLE,
      UTI: 'com.adobe.pdf',
    });
    return { status: 'shared', uri };
  } catch {
    return { status: 'fallback' };
  }
}
