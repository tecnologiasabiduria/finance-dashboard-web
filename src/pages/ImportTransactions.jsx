import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Eye,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { invalidateDashboardCache } from '../services/cache';
import { formatCurrency } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';

// ============================================
// FIELD DEFINITIONS
// ============================================

const TRANSACTION_FIELDS = [
  { key: 'skip', label: '— Omitir columna —', group: 'none' },
  { key: 'date', label: 'Fecha', required: true, group: 'general' },
  { key: 'amount', label: 'Monto / Valor', required: true, group: 'general' },
  { key: 'type', label: 'Tipo (ingreso/gasto/transferencia)', group: 'general' },
  { key: 'category', label: 'Categoría', group: 'general' },
  { key: 'description', label: 'Descripción / Notas', group: 'general' },
  { key: 'invoice_number', label: 'Número de Factura', group: 'income' },
  { key: 'invoice_status', label: 'Estado de Factura', group: 'income' },
  { key: 'client_name', label: 'Nombre del Cliente', group: 'income' },
  { key: 'client_document', label: 'Documento del Cliente', group: 'income' },
  { key: 'client_email', label: 'Email del Cliente', group: 'income' },
  { key: 'client_phone', label: 'Teléfono del Cliente', group: 'income' },
  { key: 'client_address', label: 'Dirección del Cliente', group: 'income' },
  { key: 'provider_name', label: 'Nombre del Proveedor', group: 'expense' },
  { key: 'provider_document', label: 'Documento del Proveedor', group: 'expense' },
  { key: 'payment_method', label: 'Método de Pago', group: 'expense' },
  { key: 'source_account', label: 'Cuenta Origen', group: 'transfer' },
  { key: 'destination_account', label: 'Cuenta Destino', group: 'transfer' },
];

const FIELD_GROUPS = {
  general: 'General',
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
};

const TYPE_ALIASES = {
  ingreso: 'income',
  income: 'income',
  gasto: 'expense',
  expense: 'expense',
  egreso: 'expense',
  transferencia: 'transfer',
  transfer: 'transfer',
};

// ============================================
// CSV PARSER (no external dependency needed)
// ============================================

function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  const rows = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        lines.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        lines.push(current.trim());
        current = '';
        if (lines.some((c) => c !== '')) rows.push([...lines]);
        lines.length = 0;
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }

  lines.push(current.trim());
  if (lines.some((c) => c !== '')) rows.push([...lines]);

  return rows;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const char of firstLine) {
    if (char in counts) counts[char]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseSmart(text) {
  const delimiter = detectDelimiter(text);
  const lines = [];
  let current = '';
  let inQuotes = false;
  const rows = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        lines.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        lines.push(current.trim());
        current = '';
        if (lines.length > 0) rows.push([...lines]);
        lines.length = 0;
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }

  lines.push(current.trim());
  if (lines.length > 0) rows.push([...lines]);

  return rows;
}

// ============================================
// SMART HEADER ROW DETECTION
// ============================================

function findHeaderRow(rows) {
  // Heuristic: the header row is the first row with 3+ non-empty distinct cells
  // that look like text labels (not numbers, not $ amounts)
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const nonEmpty = row.filter((c) => c && c.trim() && !/^\$/.test(c.trim()) && !/^\d+$/.test(c.trim()));
    if (nonEmpty.length >= 3) {
      return i;
    }
  }
  return 0;
}

// ============================================
// AUTO-DETECT TYPE FROM FILENAME
// ============================================

function detectTypeFromFileName(fileName) {
  const name = (fileName || '').toLowerCase();
  if (/ingreso|income|venta|revenue/i.test(name)) return 'income';
  if (/gasto|expense|egreso|cost/i.test(name)) return 'expense';
  if (/transfer/i.test(name)) return 'transfer';
  return null;
}

// ============================================
// AUTO-DETECT COLUMN MAPPING
// ============================================

function autoDetectMapping(headers) {
  const mapping = {};

  // Order matters: more specific patterns first to avoid false matches
  // Each pattern is tried in order; first match wins for that header
  const patterns = [
    // Date
    { field: 'date', regex: /fecha|date|\bdia\b/i },
    // Amount — match INGRESO COP, GASTO TOTAL COP, monto, valor, etc.
    { field: 'amount', regex: /ingreso\s*cop|gasto.*cop|monto|valor|amount|total\s*cop|\bcop\b/i },
    // Invoice number — FACTURA Nª, N° factura, etc.
    { field: 'invoice_number', regex: /factura|invoice|n[°ºª]\s*fac/i },
    // Invoice status — STATUS, estado factura
    { field: 'invoice_status', regex: /status|estado/i },
    // Category
    { field: 'category', regex: /categor[ií]a|category|rubro|tipo.*ingreso|tipo.*gasto/i },
    // Description / Notes
    { field: 'description', regex: /descripci[oó]n|description|detalle|\bnotas?\b|observ/i },
    // Provider (must be before generic "nombre")
    { field: 'provider_name', regex: /proveedor|provider|vendor/i },
    // Client name — NOMBRE, cliente
    { field: 'client_name', regex: /\bnombre\b|\bcliente\b|client.*name/i },
    // Documents — if provider already matched, this is provider doc; otherwise context-free
    { field: 'client_document', regex: /\bdocumento\b|\bnit\b|\bcc\b|\bc\.?c\b/i },
    // Address
    { field: 'client_address', regex: /direcci[oó]n|address/i },
    // Email — CORREO or email
    { field: 'client_email', regex: /correo|email|e-mail/i },
    // Phone — TELEFONO or phone
    { field: 'client_phone', regex: /tel[eé]fono|phone|celular|m[oó]vil/i },
    // Payment method
    { field: 'payment_method', regex: /m[eé]todo.*pago|payment|forma.*pago|metodo de pago/i },
    // Transfer accounts
    { field: 'source_account', regex: /cuenta.*origen|source/i },
    { field: 'destination_account', regex: /cuenta.*destino|destination/i },
  ];

  const usedFields = new Set();
  headers.forEach((header, index) => {
    for (const { field, regex } of patterns) {
      if (!usedFields.has(field) && regex.test(header)) {
        mapping[index] = field;
        usedFields.add(field);
        break;
      }
    }
    if (!mapping[index]) {
      mapping[index] = 'skip';
    }
  });

  // Smart context: if we detected provider_name but document mapped to client_document,
  // and there's no client_name → swap document to provider_document
  if (usedFields.has('provider_name') && usedFields.has('client_document') && !usedFields.has('client_name')) {
    for (const [idx, field] of Object.entries(mapping)) {
      if (field === 'client_document') {
        mapping[idx] = 'provider_document';
        break;
      }
    }
  }

  return mapping;
}

// ============================================
// DATE PARSER — handles "16 enero 2026", "1 ene 2026", DD/MM/YYYY, etc.
// ============================================

const SPANISH_MONTHS = {
  ene: '01', enero: '01',
  feb: '02', febrero: '02',
  mar: '03', marzo: '03',
  abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06',
  jul: '07', julio: '07',
  ago: '08', agosto: '08',
  sep: '09', sept: '09', septiembre: '09',
  oct: '10', octubre: '10',
  nov: '11', noviembre: '11',
  dic: '12', diciembre: '12',
};

function parseDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  // "16 enero 2026" / "1 ene 2026" / "16 de enero de 2026"
  const spanishDate = str.match(/^(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{4})/i);
  if (spanishDate) {
    const month = SPANISH_MONTHS[spanishDate[2].toLowerCase()];
    if (month) {
      return `${spanishDate[3]}-${month}-${spanishDate[1].padStart(2, '0')}`;
    }
  }

  // "enero 16, 2026" or "ene 16 2026"
  const spanishDate2 = str.match(/^(\w+)\s+(\d{1,2})[,\s]\s*(\d{4})/i);
  if (spanishDate2) {
    const month = SPANISH_MONTHS[spanishDate2[1].toLowerCase()];
    if (month) {
      return `${spanishDate2[3]}-${month}-${spanishDate2[2].padStart(2, '0')}`;
    }
  }

  // Try native Date as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return null;
}

// ============================================
// AMOUNT PARSER
// ============================================

function parseAmount(value) {
  if (!value) return null;
  const str = String(value).trim();
  // Remove currency symbols, spaces
  const cleaned = str.replace(/[$ \u00a0COP]/gi, '').trim();
  // Handle both 1.000.000,50 (ES) and 1,000,000.50 (EN)
  const hasCommaDecimal = /\d\.\d{3}/.test(cleaned) && cleaned.includes(',');
  let normalized;
  if (hasCommaDecimal) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : Math.abs(num);
}

// ============================================
// THE STEPS
// ============================================

const STEPS = [
  { id: 'upload', title: 'Subir Archivo', icon: Upload },
  { id: 'mapping', title: 'Mapear Columnas', icon: FileSpreadsheet },
  { id: 'preview', title: 'Revisar y Confirmar', icon: Eye },
  { id: 'result', title: 'Resultado', icon: Check },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ImportTransactions() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { currency } = useSettings();

  const [step, setStep] = useState(0);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [columnMapping, setColumnMapping] = useState({});
  const [defaultType, setDefaultType] = useState('expense');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);

  // ============================================
  // STEP 1: FILE UPLOAD
  // ============================================

  const processFile = useCallback((file) => {
    if (!file) return;

    const validTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !['csv', 'txt', 'tsv'].includes(ext)) {
      alert('Por favor sube un archivo CSV (.csv)');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const allRows = parseSmart(text);
      if (allRows.length < 2) {
        alert('El archivo está vacío o no tiene suficientes filas.');
        return;
      }

      // Smart header detection: skip title/empty rows at the top
      const headerIdx = findHeaderRow(allRows);
      const rows = allRows.slice(headerIdx);

      if (rows.length < 2) {
        alert('No se encontraron datos después de los encabezados.');
        return;
      }

      setRawData(rows);
      setHeaders(rows[0]);
      setColumnMapping(autoDetectMapping(rows[0]));
      setExcludedRows(new Set());

      // Auto-detect type from filename
      const detectedType = detectTypeFromFileName(file.name);
      if (detectedType) {
        setDefaultType(detectedType);
      }

      setStep(1);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ============================================
  // STEP 2: COLUMN MAPPING
  // ============================================

  const updateMapping = (colIndex, fieldKey) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      // If this field is already assigned to another column, clear it
      if (fieldKey !== 'skip') {
        for (const [key, val] of Object.entries(next)) {
          if (val === fieldKey && String(key) !== String(colIndex)) {
            next[key] = 'skip';
          }
        }
      }
      next[colIndex] = fieldKey;
      return next;
    });
  };

  const mappedFields = useMemo(() => {
    return new Set(Object.values(columnMapping).filter((v) => v !== 'skip'));
  }, [columnMapping]);

  const hasRequiredFields = mappedFields.has('date') && mappedFields.has('amount');

  // ============================================
  // STEP 3: BUILD PREVIEW DATA
  // ============================================

  const previewRows = useMemo(() => {
    const dataRows = hasHeaderRow ? rawData.slice(1) : rawData;
    return dataRows.map((row, rowIndex) => {
      const record = {};
      Object.entries(columnMapping).forEach(([colIdx, field]) => {
        if (field !== 'skip') {
          record[field] = row[parseInt(colIdx)] || '';
        }
      });

      // Parse date
      const parsedDate = parseDate(record.date);
      const dateValid = !!parsedDate;
      record.date = parsedDate || record.date;

      // Parse amount
      const parsedAmount = parseAmount(record.amount);
      const amountValid = parsedAmount !== null && parsedAmount > 0;
      record.amount = parsedAmount;

      // Parse type
      const rawType = (record.type || '').toLowerCase().trim();
      record.type = TYPE_ALIASES[rawType] || defaultType;

      // Determine validity
      const valid = dateValid && amountValid;

      return {
        _rowIndex: rowIndex,
        _valid: valid,
        _errors: [
          ...(!dateValid ? ['Fecha inválida'] : []),
          ...(!amountValid ? ['Monto inválido'] : []),
        ],
        ...record,
      };
    });
  }, [rawData, columnMapping, hasHeaderRow, defaultType]);

  // Filter out completely empty rows (no date AND no amount data at all)
  const nonEmptyPreviewRows = previewRows.filter((r) => {
    // If both date and amount are missing/empty/zero, this row is just filler
    const hasDate = r.date && String(r.date).trim();
    const hasAmount = r.amount !== null && r.amount > 0;
    return hasDate || hasAmount;
  });

  const validRows = nonEmptyPreviewRows.filter((r) => r._valid && !excludedRows.has(r._rowIndex));
  const invalidRows = nonEmptyPreviewRows.filter((r) => !r._valid);

  const toggleExcludeRow = (rowIndex) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  // ============================================
  // STEP 4: IMPORT
  // ============================================

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    try {
      const transactions = validRows.map((row) => {
        const { _rowIndex, _valid, _errors, ...data } = row;
        return data;
      });

      const result = await api.importTransactions(transactions);
      invalidateDashboardCache();
      setImportResult({
        success: true,
        imported: result.data?.imported || transactions.length,
        failed: result.data?.failed || 0,
        errors: result.data?.errors || [],
      });
      setStep(3);
    } catch (err) {
      setImportResult({
        success: false,
        imported: 0,
        failed: validRows.length,
        errors: [err.message],
      });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => (step === 0 ? navigate('/transactions') : setStep(Math.max(0, step - 1)))}
          className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Importar Transacciones</h1>
          <p className="text-dark-400 text-sm">Sube un archivo CSV y mapea las columnas</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 sm:w-12 ${
                    isDone ? 'bg-gold-400' : 'bg-dark-700'
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold-400/10 text-gold-400 border border-gold-400/30'
                    : isDone
                    ? 'bg-dark-800 text-green-400'
                    : 'bg-dark-900 text-dark-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {step === 0 && (
        <StepUpload
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleDrop={handleDrop}
          handleFileInput={handleFileInput}
          fileName={fileName}
        />
      )}

      {step === 1 && (
        <StepMapping
          headers={headers}
          rawData={rawData}
          hasHeaderRow={hasHeaderRow}
          setHasHeaderRow={setHasHeaderRow}
          columnMapping={columnMapping}
          updateMapping={updateMapping}
          mappedFields={mappedFields}
          hasRequiredFields={hasRequiredFields}
          defaultType={defaultType}
          setDefaultType={setDefaultType}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepPreview
          previewRows={nonEmptyPreviewRows}
          validRows={validRows}
          invalidRows={invalidRows}
          excludedRows={excludedRows}
          toggleExcludeRow={toggleExcludeRow}
          importing={importing}
          onImport={handleImport}
          currency={currency}
        />
      )}

      {step === 3 && <StepResult result={importResult} onDone={() => navigate('/transactions')} />}
    </div>
  );
}

// ============================================
// STEP 1: UPLOAD COMPONENT
// ============================================

function StepUpload({ dragOver, setDragOver, handleDrop, handleFileInput, fileName }) {
  return (
    <Card className="p-8">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-gold-400 bg-gold-400/5'
            : 'border-dark-700 hover:border-dark-500 hover:bg-dark-800/50'
        }`}
      >
        <input
          type="file"
          accept=".csv,.txt,.tsv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-4 rounded-2xl ${
                dragOver ? 'bg-gold-400/20 text-gold-400' : 'bg-dark-800 text-dark-400'
              }`}
            >
              <Upload className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">
                {fileName || 'Arrastra tu archivo CSV aquí'}
              </p>
              <p className="text-dark-400 mt-1">
                o haz clic para seleccionar un archivo
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <FileSpreadsheet className="h-4 w-4 text-dark-500" />
              <span className="text-sm text-dark-500">
                Formatos aceptados: .csv, .txt, .tsv
              </span>
            </div>
          </div>
        </label>
      </div>

      <div className="mt-6 p-4 bg-dark-800/50 rounded-xl">
        <h3 className="text-sm font-medium text-dark-200 mb-2">💡 Tips</h3>
        <ul className="text-sm text-dark-400 space-y-1">
          <li>• Exporta tu hoja de cálculo (Google Sheets, Excel) como archivo CSV</li>
          <li>• Asegúrate de que tenga una fila de encabezados</li>
          <li>• Como mínimo necesitas columnas de <strong className="text-dark-200">Fecha</strong> y <strong className="text-dark-200">Monto</strong></li>
          <li>• En el siguiente paso podrás indicar qué representa cada columna</li>
        </ul>
      </div>
    </Card>
  );
}

// ============================================
// STEP 2: MAPPING COMPONENT
// ============================================

function StepMapping({
  headers,
  rawData,
  hasHeaderRow,
  setHasHeaderRow,
  columnMapping,
  updateMapping,
  mappedFields,
  hasRequiredFields,
  defaultType,
  setDefaultType,
  onNext,
}) {
  const sampleRows = rawData.slice(hasHeaderRow ? 1 : 0, hasHeaderRow ? 4 : 3);

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHeaderRow}
              onChange={(e) => setHasHeaderRow(e.target.checked)}
              className="w-4 h-4 rounded bg-dark-800 border-dark-600 text-gold-400 focus:ring-gold-400/20"
            />
            <span className="text-sm text-dark-200">La primera fila son encabezados</span>
          </label>

          {!mappedFields.has('type') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Tipo por defecto:</span>
              <select
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value)}
                className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Mapping Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <h3 className="text-lg font-semibold text-white">Mapeo de Columnas</h3>
          <p className="text-sm text-dark-400 mt-1">
            Selecciona qué campo del sistema representa cada columna de tu archivo.
            Los campos <span className="text-gold-400">Fecha</span> y{' '}
            <span className="text-gold-400">Monto</span> son obligatorios.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-4 py-3">
                  #
                </th>
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 min-w-[200px]">
                    <p className="text-sm text-white font-medium mb-2 truncate" title={h}>
                      {h}
                    </p>
                    <div className="relative">
                      <select
                        value={columnMapping[i] || 'skip'}
                        onChange={(e) => updateMapping(i, e.target.value)}
                        className={`w-full px-3 py-2 bg-dark-900 border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold-400/20 ${
                          columnMapping[i] && columnMapping[i] !== 'skip'
                            ? 'border-gold-400/50 text-gold-400'
                            : 'border-dark-700 text-dark-400'
                        }`}
                      >
                        {Object.entries(
                          TRANSACTION_FIELDS.reduce((acc, f) => {
                            const group = f.group || 'none';
                            if (!acc[group]) acc[group] = [];
                            acc[group].push(f);
                            return acc;
                          }, {})
                        ).map(([group, fields]) =>
                          group === 'none' ? (
                            fields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))
                          ) : (
                            <optgroup key={group} label={FIELD_GROUPS[group]}>
                              {fields.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? '*' : ''}
                                </option>
                              ))}
                            </optgroup>
                          )
                        )}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500 pointer-events-none" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {sampleRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-dark-800/30">
                  <td className="px-4 py-3 text-xs text-dark-500">{ri + 1}</td>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-4 py-3 text-sm text-dark-300 truncate max-w-[200px]">
                      {row[ci] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mapped fields summary + Next */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {Array.from(mappedFields).map((f) => {
            const field = TRANSACTION_FIELDS.find((tf) => tf.key === f);
            return (
              <span
                key={f}
                className="px-2 py-1 bg-gold-400/10 text-gold-400 text-xs rounded-lg border border-gold-400/20"
              >
                {field?.label || f}
              </span>
            );
          })}
        </div>
        <Button
          onClick={onNext}
          disabled={!hasRequiredFields}
          variant="primary"
          className="flex items-center gap-2"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {!hasRequiredFields && (
        <p className="text-sm text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Debes mapear al menos las columnas de Fecha y Monto para continuar.
        </p>
      )}
    </div>
  );
}

// ============================================
// STEP 3: PREVIEW COMPONENT
// ============================================

function StepPreview({
  previewRows,
  validRows,
  invalidRows,
  excludedRows,
  toggleExcludeRow,
  importing,
  onImport,
  currency,
}) {
  const TYPE_LABELS = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' };
  const TYPE_COLORS = {
    income: 'text-green-400',
    expense: 'text-red-400',
    transfer: 'text-blue-400',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{previewRows.length}</p>
          <p className="text-sm text-dark-400">Filas totales</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{validRows.length}</p>
          <p className="text-sm text-dark-400">Listas para importar</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{invalidRows.length + excludedRows.size}</p>
          <p className="text-sm text-dark-400">Excluidas / con errores</p>
        </Card>
      </div>

      {/* Invalid rows warning */}
      {invalidRows.length > 0 && (
        <Card className="p-4 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">
              {invalidRows.length} fila{invalidRows.length > 1 ? 's' : ''} con errores (no se importarán)
            </h3>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {invalidRows.slice(0, 10).map((row) => (
              <div key={row._rowIndex} className="text-xs text-dark-400">
                Fila {row._rowIndex + 1}: {row._errors.join(', ')}
              </div>
            ))}
            {invalidRows.length > 10 && (
              <p className="text-xs text-dark-500">... y {invalidRows.length - 10} más</p>
            )}
          </div>
        </Card>
      )}

      {/* Preview table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <h3 className="text-lg font-semibold text-white">Vista Previa</h3>
          <p className="text-sm text-dark-400 mt-1">
            Revisa los datos antes de importar. Puedes excluir filas individuales.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-dark-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Descripción</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {previewRows.map((row) => {
                const excluded = excludedRows.has(row._rowIndex);
                const invalid = !row._valid;
                return (
                  <tr
                    key={row._rowIndex}
                    className={`transition-colors ${
                      invalid
                        ? 'bg-red-500/5 opacity-60'
                        : excluded
                        ? 'bg-dark-800/30 opacity-40'
                        : 'hover:bg-dark-800/30'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-xs text-dark-500">{row._rowIndex + 1}</td>
                    <td className="px-4 py-2.5 text-sm text-dark-200">{row.date || '—'}</td>
                    <td className={`px-4 py-2.5 text-sm font-medium ${TYPE_COLORS[row.type] || 'text-dark-300'}`}>
                      {TYPE_LABELS[row.type] || row.type || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-dark-200">
                      {row.amount != null ? formatCurrency(row.amount, currency) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-dark-300 truncate max-w-[150px]">
                      {row.category || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-dark-400 truncate max-w-[200px]">
                      {row.description || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {!invalid && (
                        <button
                          onClick={() => toggleExcludeRow(row._rowIndex)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            excluded
                              ? 'text-green-400 hover:bg-green-400/10'
                              : 'text-dark-500 hover:text-red-400 hover:bg-red-400/10'
                          }`}
                          title={excluded ? 'Incluir fila' : 'Excluir fila'}
                        >
                          {excluded ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                      )}
                      {invalid && (
                        <span className="text-xs text-red-400" title={row._errors.join(', ')}>
                          <AlertTriangle className="h-4 w-4 inline" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-400">
          Se importarán <strong className="text-white">{validRows.length}</strong> transacciones
        </p>
        <Button
          onClick={onImport}
          disabled={validRows.length === 0 || importing}
          variant="primary"
          className="flex items-center gap-2"
        >
          {importing ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-dark-900 border-t-transparent rounded-full" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Importar {validRows.length} Transacciones
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// STEP 4: RESULT COMPONENT
// ============================================

function StepResult({ result, onDone }) {
  if (!result) return null;
  return (
    <Card className="p-8 text-center">
      <div
        className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          result.success ? 'bg-green-400/10' : 'bg-red-400/10'
        }`}
      >
        {result.success ? (
          <Check className="h-8 w-8 text-green-400" />
        ) : (
          <X className="h-8 w-8 text-red-400" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        {result.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
      </h2>

      {result.success ? (
        <p className="text-dark-400 mb-6">
          Se importaron <strong className="text-green-400">{result.imported}</strong> transacciones
          correctamente.
          {result.failed > 0 && (
            <span className="text-amber-400"> {result.failed} fallaron.</span>
          )}
        </p>
      ) : (
        <div className="mb-6">
          <p className="text-dark-400 mb-2">No se pudieron importar las transacciones.</p>
          {result.errors?.length > 0 && (
            <div className="bg-dark-800 rounded-lg p-3 mt-2 max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-400">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={onDone} variant="primary">
        Ir a Transacciones
      </Button>
    </Card>
  );
}
