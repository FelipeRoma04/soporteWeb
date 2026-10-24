import ExcelJS from 'exceljs';

const HEADER_COLOR = 'FF3D7077';
const MIN_WIDTH = 9;

// Largo "visible" de un valor para calcular el ancho de la columna (en texto con saltos de línea cuenta la línea más larga).
function displayLength(value, type) {
  if (value === null || value === undefined || value === '') return 0;
  if (type === 'datetime') return 16;
  return String(value).split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);
}

// Crea un .xlsx con encabezado fijo, filtros en todas las columnas y ancho de columna según el contenido.
// columns: [{ header, key, type?: 'datetime' | 'number', wrap?: boolean, maxWidth?: number, numFmt?: string }]
export async function toXlsxBuffer({ sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SysPulse';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key }));
  rows.forEach((row) => sheet.addRow(row));

  // Ancho = el texto más largo de la columna (con un mínimo y un máximo; los textos largos se ajustan en varias líneas).
  columns.forEach((column, index) => {
    const longest = rows.reduce((max, row) => Math.max(max, displayLength(row[column.key], column.type)), column.header.length + 4);
    sheet.getColumn(index + 1).width = Math.min(column.maxWidth || 45, Math.max(MIN_WIDTH, longest + 2));
  });

  sheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = columns[columnNumber - 1];
      if (!column) return;
      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        return;
      }
      cell.alignment = { vertical: 'top', wrapText: Boolean(column.wrap) };
      if (column.type === 'datetime') cell.numFmt = 'yyyy-mm-dd hh:mm';
      else if (column.numFmt) cell.numFmt = column.numFmt;
    });
  });
  sheet.getRow(1).height = 24;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.rowCount, 1), column: columns.length } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}