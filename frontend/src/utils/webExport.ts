/**
 * Utilidades de conveniencia web para BargAIn.
 *
 * Todas las funciones están protegidas con Platform.OS !== 'web'
 * para garantizar comportamiento no-op en dispositivos nativos.
 *
 * Funciones exportadas:
 * - downloadFile: descarga un fichero en el navegador
 * - copyToClipboard: copia texto al portapapeles (con fallback execCommand)
 * - buildCsv: genera CSV con escapado de inyección de fórmulas (OWASP)
 * - todayStamp: devuelve la fecha actual en formato YYYY-MM-DD
 */

import { Platform } from 'react-native';

/**
 * Descarga un fichero en el navegador usando un enlace <a> temporal.
 * No-op en plataformas nativas.
 *
 * Convenio de nombre: `bargain-{tipo}-{YYYY-MM-DD}.{ext}`
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Copia texto al portapapeles del navegador.
 * Usa navigator.clipboard (API moderna) con fallback a execCommand('copy').
 * Devuelve false en plataformas nativas.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para contextos HTTP (Clipboard API requiere HTTPS o localhost)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Escapa una celda CSV según RFC 4180 e incluye protección contra
 * inyección de fórmulas de hoja de cálculo (OWASP CSV Injection Guard).
 *
 * Reglas:
 * 1. Celdas que empiezan por = + - @ → prefijo con comilla simple
 * 2. Celdas con comas, comillas dobles o saltos de línea → envolver en comillas dobles
 *    y escapar comillas internas duplicándolas
 */
function escapeCsvCell(value: string): string {
  let cell = value ?? '';
  // Guard against formula injection (OWASP)
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  // RFC 4180 quoting
  if (/[",\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

/**
 * Construye una cadena CSV a partir de cabeceras y filas de texto.
 * Aplica escapado de inyección de fórmulas y cumple RFC 4180.
 */
export function buildCsv(headers: string[], rows: string[][]): string {
  const head = headers.map(escapeCsvCell).join(',');
  const body = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  return `${head}\n${body}`;
}

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD (ISO 8601).
 * Útil para construir nombres de fichero: `bargain-lista-2026-06-01.txt`.
 */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
