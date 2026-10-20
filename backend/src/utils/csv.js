// CSV pensado para abrirse con doble clic en Excel (configuración regional en español): separador ";", BOM UTF-8 y saltos CRLF.
const DELIMITER = ';';

// Evita "inyección de fórmulas": una celda que empieza con = + - @ se interpretaría como fórmula al abrirla en Excel.
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(DELIMITER), ...rows.map((row) => row.map(escapeCell).join(DELIMITER))];
  return `﻿${lines.join('\r\n')}\r\n`;
}
