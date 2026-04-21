import { useState } from 'react';
import { printReport } from '../utils/printReport';

/* ─── helpers ─── */
function parseMoney(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}
function formatThousands(str) {
  const digits = String(str).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function parsePct(str) {
  return parseFloat(String(str).replace(',', '.')) || 0;
}
function fmtCOP(n) {
  if (!n || isNaN(n) || !isFinite(n)) return '';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n, dec = 2) {
  if (!n || isNaN(n) || !isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
}

const COLS = [
  { key: 'low',  label: 'Precio Bajo' },
  { key: 'mid',  label: 'Precio Medio' },
  { key: 'high', label: 'Precio Alto' },
];

const ROW_LABELS = ['% Aporte Meta', 'Facturación', 'Precio', 'Und Año', 'Und Mes', 'Und Semana', 'Und Día'];
const INPUT_ROWS = [0, 2]; // índices de filas que son inputs (% Aporte Meta, Precio)

function generatePrintHTML({ facturacionVal, utilidadPctVal, utilidadAnio, utilidadMes, productos, calcs }) {
  const rows = [
    productos.map(p => `${parsePct(p.aportePct) || ''}%`),
    calcs.map(c => fmtCOP(c.facturacion)),
    productos.map(p => fmtCOP(parseMoney(p.precio))),
    calcs.map(c => fmtNum(c.undAnio)),
    calcs.map(c => fmtNum(c.undMes)),
    calcs.map(c => fmtNum(c.undSemana)),
    calcs.map(c => fmtNum(c.undDia)),
  ];
  const cell = (v) => `<td style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-size:12px;">${v}</td>`;
  const th = (v, extra='') => `<th style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:#f5f5f5;${extra}">${v}</th>`;
  return `
    <div class="print-report">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:32px;font-weight:900;letter-spacing:0.05em;margin-bottom:4px;">FINANZAS SABIAS</h1>
      </div>
      <section>
        <p style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">
          Facturación Año: <span style="border-bottom:2px solid #000;padding-bottom:2px;min-width:200px;display:inline-block;">&nbsp;${fmtCOP(facturacionVal)}&nbsp;</span>
        </p>
        <table style="border-collapse:collapse;margin-bottom:32px;width:auto;">
          <thead><tr>${th('% Utilidad')}${th('Utilidad Año')}${th('Utilidad Mes')}</tr></thead>
          <tbody><tr>${cell(utilidadPctVal ? utilidadPctVal+'%' : '')}${cell(fmtCOP(utilidadAnio))}${cell(fmtCOP(utilidadMes))}</tr></tbody>
        </table>
        <h2 style="background:#000;color:#fff;text-align:center;padding:8px;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;border:1px solid #000;">Escenario Pesimista</h2>
        <table style="border-collapse:collapse;width:100%;border:2px solid #5b21b6;">
          <tbody>
            <tr>
              <td style="border:1px solid #ccc;padding:8px 12px;font-size:12px;font-weight:700;text-transform:uppercase;">Meta Facturación Año</td>
              <td colspan="3" style="border:1px solid #ccc;padding:8px 12px;font-size:13px;font-weight:700;">${fmtCOP(facturacionVal)}</td>
            </tr>
            <tr>
              <th style="border:1px solid #ccc;padding:8px;"></th>
              ${COLS.map(c => th(c.label)).join('')}
            </tr>
            ${ROW_LABELS.map((label, ri) => `
              <tr>
                <td style="border:1px solid #ccc;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;background:#f9f9f9;">${label}</td>
                ${rows[ri].map(v => cell(v)).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </section>
      <footer style="margin-top:40px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;line-height:1.4;">
          WORKSHOP<br>CRECIMIENTO EMPRESARIAL
        </div>
        <div style="font-size:12px;font-weight:700;">@DIANACORTESCEO</div>
      </footer>
    </div>`;
}

/* ─── shared cell styles ─── */
const BORDER = '1px solid #d1d5db';
const TH_STYLE = {
  border: BORDER,
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  background: '#f9fafb',
  textAlign: 'center',
  color: '#111',
};
const TD_LABEL = {
  border: BORDER,
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#374151',
  background: '#f9fafb',
  whiteSpace: 'nowrap',
};
const TD_VALUE = {
  border: BORDER,
  padding: '0',
  textAlign: 'center',
};

function FormInput({ value, onChange, placeholder = '', align = 'left', style = {} }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        textAlign: align,
        fontSize: '13px',
        fontWeight: 600,
        color: '#111',
        padding: '10px 12px',
        fontFamily: 'inherit',
        ...style,
      }}
    />
  );
}

export default function Workshop() {
  const [facturacion, setFacturacion]   = useState('');
  const [utilidadPct, setUtilidadPct]   = useState('');
  const [productos, setProductos]       = useState([
    { aportePct: '', precio: '' },
    { aportePct: '', precio: '' },
    { aportePct: '', precio: '' },
  ]);

  const facturacionVal = parseMoney(facturacion);
  const utilidadPctVal = parsePct(utilidadPct);
  const utilidadAnio   = facturacionVal * utilidadPctVal / 100;
  const utilidadMes    = utilidadAnio / 12;

  const calcs = productos.map(p => {
    const aporte  = parsePct(p.aportePct);
    const precio  = parseMoney(p.precio);
    const fact    = facturacionVal * aporte / 100;
    const undAnio = precio > 0 ? fact / precio : 0;
    return { facturacion: fact, undAnio, undMes: undAnio / 12, undSemana: undAnio / 52, undDia: undAnio / 365 };
  });

  const setProducto = (i, field, value) =>
    setProductos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  const handlePrint = () => {
    const html = generatePrintHTML({ facturacionVal, utilidadPctVal, utilidadAnio, utilidadMes, productos, calcs });
    printReport(html, 'Finanzas Sabias – Workshop');
  };

  const rows = [
    productos.map((p, i) => (
      <FormInput key={i} value={p.aportePct} onChange={v => setProducto(i, 'aportePct', v)} placeholder="50" align="center" />
    )),
    calcs.map((c, i) => (
      <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtCOP(c.facturacion)}</span>
    )),
    productos.map((p, i) => (
      <FormInput key={i} value={p.precio} onChange={v => setProducto(i, 'precio', formatThousands(v))} placeholder="90.000" align="center" />
    )),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undAnio)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undMes)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undSemana)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undDia)}</span>),
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* ── TÍTULO ── */}
        <h1 style={{ textAlign: 'center', fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, letterSpacing: '0.06em', marginBottom: 40, textTransform: 'uppercase' }}>
          Finanzas Sabias
        </h1>

        {/* ── FACTURACIÓN AÑO ── */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            Facturación Año:
          </label>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              inputMode="decimal"
              value={facturacion}
              onChange={e => setFacturacion(formatThousands(e.target.value))}
              placeholder="100.000.000"
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '2px solid #111',
                outline: 'none',
                background: 'transparent',
                fontSize: 16,
                fontWeight: 700,
                padding: '4px 0',
                fontFamily: 'inherit',
                color: '#111',
              }}
            />
            {facturacionVal > 0 && (
              <span style={{ position: 'absolute', right: 0, top: 4, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                {fmtCOP(facturacionVal)}
              </span>
            )}
          </div>
        </div>

        {/* ── TABLA UTILIDAD ── */}
        <table style={{ borderCollapse: 'collapse', marginBottom: 36, width: 'auto' }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, minWidth: 100 }}>% Utilidad</th>
              <th style={{ ...TH_STYLE, minWidth: 130 }}>Utilidad Año</th>
              <th style={{ ...TH_STYLE, minWidth: 130 }}>Utilidad Mes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: BORDER, padding: 0, height: 44 }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <FormInput value={utilidadPct} onChange={setUtilidadPct} placeholder="40" align="center" />
                </div>
              </td>
              <td style={{ border: BORDER, textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, height: 44 }}>
                {fmtCOP(utilidadAnio)}
              </td>
              <td style={{ border: BORDER, textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, height: 44 }}>
                {fmtCOP(utilidadMes)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── TABLA ESCENARIO ── */}
        <table style={{ borderCollapse: 'collapse', width: '100%', border: '2px solid #5b21b6' }}>
          {/* Header negro */}
          <thead>
            <tr>
              <th
                colSpan={4}
                style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '10px 14px', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}
              >
                Escenario Pesimista
              </th>
            </tr>
            {/* Meta facturación */}
            <tr>
              <td style={{ border: BORDER, padding: '10px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Meta Facturación Año
              </td>
              <td colSpan={3} style={{ border: BORDER, padding: '10px 14px', fontSize: 14, fontWeight: 700 }}>
                {fmtCOP(facturacionVal)}
              </td>
            </tr>
            {/* Columnas */}
            <tr>
              <th style={{ ...TH_STYLE, width: 160 }}></th>
              {COLS.map(col => (
                <th key={col.key} style={{ ...TH_STYLE, minWidth: 120 }}>{col.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROW_LABELS.map((label, ri) => (
              <tr key={ri}>
                <td style={TD_LABEL}>{label}</td>
                {rows[ri].map((cell, ci) => (
                  <td key={ci} style={{ ...TD_VALUE, height: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: INPUT_ROWS.includes(ri) ? 0 : '10px 14px' }}>
                      {cell}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── BOTÓN ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <button
            onClick={handlePrint}
            disabled={!facturacionVal}
            style={{
              border: '2px solid #111',
              background: 'transparent',
              padding: '12px 36px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: facturacionVal ? 'pointer' : 'not-allowed',
              opacity: facturacionVal ? 1 : 0.3,
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
            onMouseEnter={e => { if (facturacionVal) { e.target.style.background = '#111'; e.target.style.color = '#fff'; } }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#111'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Imprimir / Descargar PDF
          </button>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.5 }}>
            Workshop<br />Crecimiento Empresarial
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
            @DIANACORTESCEO
          </div>
        </div>

      </div>
    </div>
  );
}
