import { useState, useSyncExternalStore } from 'react';
import { printReport } from '../utils/printReport';

function useMediaMinWidth(px) {
  const q = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(q);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(q).matches,
    () => true,
  );
}

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

function generatePrintHTML({ facturacionVal, utilidadPctVal, utilidadAnio, utilidadMes, productos, calcs, assetOrigin }) {
  const logoSrc = `${assetOrigin}/assets/brand/workshop-sabiduria-empresarial.png`;
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
      <header style="text-align:center;margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #111;">
        <img src="${logoSrc}" alt="Sabiduría Empresarial" width="3050" height="279" style="display:block;margin:0 auto 16px;max-width:min(280px,72vw);width:auto;height:auto;max-height:34px;object-fit:contain;object-position:center;" />
        <h1 style="font-size:clamp(22px,5vw,30px);font-weight:900;letter-spacing:0.06em;margin:0;text-transform:uppercase;line-height:1.1;">Finanzas Sabias</h1>
      </header>
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
  padding: '10px 12px',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#374151',
  background: '#f9fafb',
};
const TD_VALUE = {
  border: BORDER,
  padding: '0',
  textAlign: 'center',
};

/** Fondo tenue para celdas/campos editables (gold marca, legible sobre blanco) */
const EDITABLE_SURFACE = 'rgba(234, 173, 116, 0.2)';
const TD_EDITABLE = {
  ...TD_VALUE,
  backgroundColor: EDITABLE_SURFACE,
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

/** Prefijo/sufijo fijo ($, %) junto a inputs en celdas editables para evitar confusión */
function InputAffix({ prefix, suffix, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 6,
        padding: '0 6px',
      }}
    >
      {prefix != null && (
        <span style={{ fontWeight: 700, fontSize: 13, color: '#111', flexShrink: 0 }} aria-hidden>
          {prefix}
        </span>
      )}
      <div style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
      {suffix != null && (
        <span style={{ fontWeight: 700, fontSize: 13, color: '#111', flexShrink: 0 }} aria-hidden>
          {suffix}
        </span>
      )}
    </div>
  );
}

export default function Workshop() {
  const escenarioTabla = useMediaMinWidth(720);

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
    const html = generatePrintHTML({
      facturacionVal,
      utilidadPctVal,
      utilidadAnio,
      utilidadMes,
      productos,
      calcs,
      assetOrigin: window.location.origin,
    });
    printReport(html, 'Finanzas Sabias – Workshop');
  };

  const rows = [
    productos.map((p, i) => (
      <InputAffix key={i} suffix="%">
        <FormInput value={p.aportePct} onChange={v => setProducto(i, 'aportePct', v)} placeholder="50" align="center" />
      </InputAffix>
    )),
    calcs.map((c, i) => (
      <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtCOP(c.facturacion)}</span>
    )),
    productos.map((p, i) => (
      <InputAffix key={i} prefix="$">
        <FormInput value={p.precio} onChange={v => setProducto(i, 'precio', formatThousands(v))} placeholder="90.000" align="center" />
      </InputAffix>
    )),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undAnio)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undMes)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undSemana)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtNum(c.undDia)}</span>),
  ];

  return (
    <div className="workshop-page" style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <style>{`
        .workshop-page { box-sizing: border-box; }
        .workshop-page * { box-sizing: border-box; }
        .workshop-brandbar {
          background: transparent;
          margin: 0 auto 14px;
          padding: 0 8px;
          text-align: center;
        }
        .workshop-brandbar img {
          display: block;
          margin: 0 auto;
          width: auto;
          max-width: min(243px, 56.32vw);
          height: auto;
          max-height: clamp(21px, 4.48vw, 27px);
        }
        .workshop-hero-title {
          text-align: center;
          font-size: clamp(24px, 6vw, 42px);
          font-weight: 900;
          letter-spacing: 0.06em;
          margin: 0 0 clamp(22px, 4vw, 36px);
          text-transform: uppercase;
          line-height: 1.08;
        }
        .workshop-inner { max-width: 680px; margin: 0 auto; padding: clamp(24px, 5vw, 48px) clamp(14px, 4vw, 24px) clamp(40px, 8vw, 64px); }
        .workshop-facturacion { display: flex; align-items: baseline; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
        .workshop-facturacion-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0; }
        .workshop-facturacion-field { flex: 1 1 220px; min-width: 0; position: relative; background: ${EDITABLE_SURFACE}; border-radius: 8px; padding: 8px 12px 10px; }
        .workshop-table-scroll { margin-bottom: 36px; }
        .workshop-table-scroll table { width: 100%; }
        .workshop-table-escenario { border-collapse: collapse; width: 100%; border: none; table-layout: fixed; }
        .workshop-label-cell { white-space: normal; word-break: break-word; }
        @media (min-width: 640px) {
          .workshop-label-cell { white-space: nowrap; }
        }
        .workshop-escenario-shell { border: 2px solid #5b21b6; }
        .workshop-escenario-mobile { display: flex; flex-direction: column; gap: 0; }
        .workshop-escenario-card { border-top: 1px solid #d1d5db; }
        .workshop-escenario-card-head {
          background: #ede9fe; color: #4c1d95; text-align: center; padding: 8px 12px;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
        }
        .workshop-escenario-row { display: flex; border-bottom: 1px solid #d1d5db; min-height: 40px; }
        .workshop-escenario-row:last-child { border-bottom: none; }
        .workshop-escenario-row-label {
          flex: 0 0 44%; max-width: 160px; padding: 8px 10px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: #374151; background: #f9fafb;
          display: flex; align-items: center; border-right: 1px solid #d1d5db;
        }
        .workshop-escenario-row-val {
          flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center;
          text-align: center; font-size: 13px; font-weight: 600; color: #111;
        }
        .workshop-escenario-row-val input { width: 100%; }
        .workshop-escenario-row-val--edit { background: ${EDITABLE_SURFACE}; }
        .workshop-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 56px; border-top: 1px solid #e5e7eb; padding-top: 24px; gap: 16px; flex-wrap: wrap; }
        @media (max-width: 520px) {
          .workshop-footer { flex-direction: column; text-align: center; align-items: center; }
        }
      `}</style>
      <div className="workshop-inner">

        {/* ── Marca + título principal ── */}
        <header className="workshop-brandbar">
          <img
            src="/assets/brand/workshop-sabiduria-empresarial.png"
            alt="Sabiduría Empresarial"
            width={3050}
            height={279}
            decoding="async"
          />
        </header>
        <h1 className="workshop-hero-title">Finanzas Sabias</h1>

        {/* ── FACTURACIÓN AÑO ── */}
        <div className="workshop-facturacion">
          <label className="workshop-facturacion-label" htmlFor="workshop-facturacion-input">
            Facturación Año:
          </label>
          <div className="workshop-facturacion-field">
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                width: '100%',
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 800,
                  color: '#111',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                $
              </span>
              <input
                id="workshop-facturacion-input"
                type="text"
                inputMode="decimal"
                value={facturacion}
                onChange={e => setFacturacion(formatThousands(e.target.value))}
                placeholder="100.000.000"
                aria-label="Facturación del año en pesos colombianos"
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  border: 'none',
                  borderBottom: '2px solid #111',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 700,
                  padding: '4px 0',
                  fontFamily: 'inherit',
                  color: '#111',
                }}
              />
            </div>
            {facturacionVal > 0 && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#6b7280', fontWeight: 500, wordBreak: 'break-word' }}>
                {fmtCOP(facturacionVal)}
              </span>
            )}
          </div>
        </div>

        {/* ── TABLA UTILIDAD ── */}
        <div className="workshop-table-scroll">
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ ...TH_STYLE, minWidth: 88, width: '28%' }}>% Utilidad</th>
                <th style={{ ...TH_STYLE, minWidth: 110, width: '36%' }}>Utilidad Año</th>
                <th style={{ ...TH_STYLE, minWidth: 110, width: '36%' }}>Utilidad Mes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: BORDER, padding: 0, height: 44, backgroundColor: EDITABLE_SURFACE }}>
                  <InputAffix suffix="%">
                    <FormInput value={utilidadPct} onChange={setUtilidadPct} placeholder="40" align="center" />
                  </InputAffix>
                </td>
                <td style={{ border: BORDER, textAlign: 'center', padding: '10px 12px', fontSize: 'clamp(12px, 2.8vw, 13px)', fontWeight: 600, height: 44 }}>
                  {fmtCOP(utilidadAnio)}
                </td>
                <td style={{ border: BORDER, textAlign: 'center', padding: '10px 12px', fontSize: 'clamp(12px, 2.8vw, 13px)', fontWeight: 600, height: 44 }}>
                  {fmtCOP(utilidadMes)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── ESCENARIO (tabla en escritorio / tarjetas apiladas en móvil — sin scroll horizontal) ── */}
        <div className="workshop-escenario-shell">
          <div
            style={{
              background: '#000',
              color: '#fff',
              textAlign: 'center',
              padding: '10px 14px',
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Escenario Pesimista
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              borderBottom: BORDER,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                flex: '1 1 160px',
                minWidth: 0,
              }}
            >
              Meta Facturación Año
            </div>
            <div
              style={{
                padding: '10px 12px',
                fontSize: 'clamp(13px, 3.2vw, 14px)',
                fontWeight: 700,
                flex: '1 1 200px',
                minWidth: 0,
                textAlign: 'center',
              }}
            >
              {fmtCOP(facturacionVal)}
            </div>
          </div>

          {escenarioTabla ? (
            <table className="workshop-table-escenario">
              <thead>
                <tr>
                  <th style={{ ...TH_STYLE, width: '26%' }} />
                  {COLS.map(col => (
                    <th key={col.key} style={{ ...TH_STYLE, width: '24.67%' }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_LABELS.map((label, ri) => (
                  <tr key={ri}>
                    <td className="workshop-label-cell" style={{ ...TD_LABEL, width: '26%', minWidth: 88 }}>{label}</td>
                    {rows[ri].map((cell, ci) => (
                      <td key={ci} style={{ ...(INPUT_ROWS.includes(ri) ? TD_EDITABLE : TD_VALUE), height: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: INPUT_ROWS.includes(ri) ? 0 : '10px 8px' }}>
                          {cell}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="workshop-escenario-mobile">
              {COLS.map((col, ci) => (
                <div className="workshop-escenario-card" key={col.key}>
                  <div className="workshop-escenario-card-head">{col.label}</div>
                  {ROW_LABELS.map((label, ri) => (
                    <div className="workshop-escenario-row" key={`${col.key}-${ri}`}>
                      <div className="workshop-escenario-row-label">{label}</div>
                      <div className={`workshop-escenario-row-val${INPUT_ROWS.includes(ri) ? ' workshop-escenario-row-val--edit' : ''}`}>
                        {rows[ri][ci]}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

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
        <div className="workshop-footer">
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
