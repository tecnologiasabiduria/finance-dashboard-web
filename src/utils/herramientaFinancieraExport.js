/**
 * Exportación usando la plantilla "Herramienta financiera 2" (Excel con estilos).
 * Archivo: public/templates/herramienta-financiera-2.xlsx
 *
 * ExcelJS se importa dinámicamente para evitar bloquear la carga de componentes.
 */

const TEMPLATE_PATH = `${import.meta.env.BASE_URL}templates/herramienta-financiera-2.xlsx`;

async function getExcelJS() {
  const module = await import('exceljs');
  return module.default || module;
}

export const SHEET_INGRESOS = ' INGRESOS';
export const SHEET_GASTOS = 'GASTOS';
export const SHEET_INFORME_MES = 'INFORME MES ';
export const SHEET_CARTERA = 'CARTERA';

function parseTxDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapIncomeTipo(t) {
  const c = (t.category || '').toLowerCase();
  if (c.includes('cartera')) return 'CARTERA';
  if (c.includes('venta')) return 'VENTA';
  return 'OTRO';
}

async function loadWorkbookFromTemplate() {
  const ExcelJS = await getExcelJS();
  const res = await fetch(TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(`Plantilla no encontrada (${res.status}). Coloca herramienta-financiera-2.xlsx en public/templates/`);
  }
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

function clearColumnRange(ws, startRow, endRow, cols) {
  for (let r = startRow; r <= endRow; r++) {
    for (const c of cols) {
      ws.getCell(r, c).value = null;
    }
  }
}

/**
 * Exporta transacciones a la plantilla (solo INGRESOS y GASTOS).
 * @param {object[]} transactions - Lista ya filtrada (misma que la vista)
 */
export async function exportTransactionsHerramientaTemplate(transactions) {
  const wb = await loadWorkbookFromTemplate();

  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const wsIn = wb.getWorksheet(SHEET_INGRESOS);
  const wsGas = wb.getWorksheet(SHEET_GASTOS);

  if (!wsIn || !wsGas) {
    throw new Error('La plantilla no contiene las hojas esperadas (INGRESOS / GASTOS)');
  }

  // Eliminar hojas que no necesitamos
  const sheetInforme = wb.getWorksheet(SHEET_INFORME_MES);
  const sheetAnual = wb.getWorksheet('ANUAL');
  const sheetCartera = wb.getWorksheet(SHEET_CARTERA);
  if (sheetInforme) wb.removeWorksheet(sheetInforme.id);
  if (sheetAnual) wb.removeWorksheet(sheetAnual.id);
  if (sheetCartera) wb.removeWorksheet(sheetCartera.id);

  clearColumnRange(wsIn, 4, 2000, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  clearColumnRange(wsGas, 4, 2000, [1, 2, 3, 4, 5, 6, 7]);

  incomes.forEach((t, i) => {
    const r = 4 + i;
    wsIn.getCell(r, 1).value = parseTxDate(t.date);
    wsIn.getCell(r, 2).value = t.invoice_number || null;
    wsIn.getCell(r, 3).value = mapIncomeTipo(t);
    wsIn.getCell(r, 4).value = t.client_document != null ? String(t.client_document) : null;
    wsIn.getCell(r, 5).value = t.client_name || null;
    wsIn.getCell(r, 6).value = t.client_address || null;
    wsIn.getCell(r, 7).value = t.client_email || null;
    wsIn.getCell(r, 8).value = t.client_phone || null;
    wsIn.getCell(r, 9).value = parseFloat(t.amount) || 0;
  });

  expenses.forEach((t, i) => {
    const r = 4 + i;
    wsGas.getCell(r, 1).value = parseTxDate(t.date);
    wsGas.getCell(r, 2).value = t.provider_document != null ? String(t.provider_document) : null;
    wsGas.getCell(r, 3).value = t.provider_name || null;
    wsGas.getCell(r, 4).value = t.category || null;
    wsGas.getCell(r, 5).value = t.payment_method || null;
    wsGas.getCell(r, 6).value = parseFloat(t.amount) || 0;
    wsGas.getCell(r, 7).value = t.description || null;
  });

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

function styleTitleRow(ws, title, colCount) {
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF261C21' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEAAD74' },
  };
  ws.getRow(1).height = 30;
}

function styleHeaderRow(ws, row, colCount) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF261C21' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }
  ws.getRow(row).height = 22;
}

/**
 * Exporta cartera: crea archivo Excel con solo la hoja CARTERA.
 */
export async function exportCarteraHerramientaTemplate(records) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  const wsC = wb.addWorksheet('CARTERA');

  const headers = [
    'NOMBRE',
    'DOCUMENTO',
    'EMAIL',
    'TELÉFONO',
    'DIRECCIÓN',
    'PLATAFORMA',
    'FUENTE',
    'PRODUCTO',
    'FECHA VENTA',
    'VALOR VENTA',
    'CONTADO',
    'SALDO',
    'NOTAS',
  ];

  styleTitleRow(wsC, 'CARTERA', headers.length);

  headers.forEach((h, i) => {
    wsC.getCell(3, i + 1).value = h;
  });
  styleHeaderRow(wsC, 3, headers.length);

  wsC.columns = [
    { width: 25 },
    { width: 15 },
    { width: 28 },
    { width: 15 },
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 20 },
    { width: 14 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
    { width: 30 },
  ];

  records.forEach((r, i) => {
    const row = 4 + i;
    wsC.getCell(row, 1).value = r.nombre || '';
    wsC.getCell(row, 2).value = r.documento || '';
    wsC.getCell(row, 3).value = r.email || '';
    wsC.getCell(row, 4).value = r.telefono || '';
    wsC.getCell(row, 5).value = r.direccion || '';
    wsC.getCell(row, 6).value = r.plataforma || '';
    wsC.getCell(row, 7).value = r.fuente || '';
    wsC.getCell(row, 8).value = r.producto || '';
    wsC.getCell(row, 9).value = r.fecha_venta || '';
    wsC.getCell(row, 10).value = parseFloat(r.valor_venta) || 0;
    wsC.getCell(row, 10).numFmt = '#,##0';
    wsC.getCell(row, 11).value = parseFloat(r.cash) || 0;
    wsC.getCell(row, 11).numFmt = '#,##0';
    wsC.getCell(row, 12).value = parseFloat(r.saldo) || 0;
    wsC.getCell(row, 12).numFmt = '#,##0';
    wsC.getCell(row, 13).value = r.notas || '';

    for (let c = 1; c <= headers.length; c++) {
      wsC.getCell(row, c).border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    }
  });

  wsC.views = [{ state: 'frozen', ySplit: 3 }];
  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export function downloadExcelBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
