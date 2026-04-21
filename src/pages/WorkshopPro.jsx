import { useState, useEffect } from 'react';
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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtNum(n, dec = 2) {
  if (!n || isNaN(n) || !isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(n);
}

const COLS = [
  { key: 'low',  label: 'Precio Bajo',  sub: 'Low Ticket'   },
  { key: 'mid',  label: 'Precio Medio', sub: 'Middle Ticket' },
  { key: 'high', label: 'Precio Alto',  sub: 'High Ticket'   },
];
const ROW_LABELS = ['% Aporte Meta', 'Facturación', 'Precio', 'Und Año', 'Und Mes', 'Und Semana', 'Und Día'];
const INPUT_ROWS = new Set([0, 2]);

const B = {
  terracotta : '#7e301f',
  amber      : '#da7d41',
  sand       : '#eaad74',
  cream      : '#f5ece0',
  parchment  : '#fdf8f2',
  border     : '#e2c9a8',
  borderLight: '#ede0cc',
  labelColor : '#7e301f',
  textDark   : '#2d1a0e',
  textMid    : '#6b3d1e',
  textLight  : '#a0714a',
};
const GRAD = `linear-gradient(135deg, ${B.terracotta} 0%, ${B.amber} 55%, #f2cc88 100%)`;

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

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
  const cell = v => `<td style="border:1px solid #ccc;padding:9px 14px;text-align:center;font-size:12px;">${v}</td>`;
  const th   = v => `<th style="border:1px solid #ccc;padding:9px 14px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:#f5f5f5;">${v}</th>`;
  return `
    <div class="print-report">
      <div class="print-report-header">
        <div>
          <h1 class="print-report-title">FINANZAS SABIAS</h1>
          <p class="print-report-subtitle">Workshop Crecimiento Empresarial · @dianacortesceo</p>
        </div>
        <div style="text-align:right;font-size:12px;color:#888;">
          ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <section>
        <h2>Datos Financieros</h2>
        <table>
          <thead><tr><th>Facturación del Año</th><th>% Utilidad</th><th>Utilidad Año</th><th>Utilidad Mes</th></tr></thead>
          <tbody>
            <tr>
              <td class="text-center font-bold" style="font-size:14px;">${fmtCOP(facturacionVal)}</td>
              <td class="text-center font-bold">${utilidadPctVal}%</td>
              <td class="text-center font-bold" style="color:#da7d41;">${fmtCOP(utilidadAnio)}</td>
              <td class="text-center font-bold" style="color:#da7d41;">${fmtCOP(utilidadMes)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2 style="background:#7f1d1d;color:white;padding:10px 16px;border-radius:4px;border:none;text-align:center;letter-spacing:2px;">ESCENARIO PESIMISTA</h2>
        <p style="font-size:12px;color:#555;margin-bottom:10px;">Meta Facturación Año: <strong>${fmtCOP(facturacionVal)}</strong></p>
        <table>
          <thead>
            <tr>
              <th style="width:160px;"></th>
              ${COLS.map(c => `<th class="text-center" style="background:#7f1d1d;color:white;">${c.label}<br><span style="font-size:10px;font-weight:400;">${c.sub}</span></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${ROW_LABELS.map((label, ri) => `
              <tr style="${ri % 2 === 0 ? 'background:#fafafa;' : ''}">
                <td style="${INPUT_ROWS.has(ri) ? 'font-weight:700;color:#da7d41;' : 'color:#444;'}">${label}</td>
                ${rows[ri].map(v => `<td class="text-center font-semibold">${v}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </section>
      <footer><p>Workshop Crecimiento Empresarial · @dianacortesceo · Finanzas Sabias</p></footer>
    </div>`;
}

/* ── Field ── */
function Field({ label, value, onChange, placeholder, suffix, preview }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: B.labelColor, marginBottom: 8 }}>
        {label}
      </label>
      <div style={{
        position: 'relative',
        border: `1.5px solid ${focused ? B.amber : B.border}`,
        borderRadius: 6,
        background: '#fff',
        transition: 'border-color 0.15s',
        boxShadow: focused ? `0 0 0 3px ${B.amber}18` : 'none',
      }}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            padding: suffix ? '13px 40px 13px 16px' : '13px 16px',
            fontSize: 16, fontWeight: 700, color: B.textDark, fontFamily: 'inherit',
            caretColor: B.amber, boxSizing: 'border-box',
          }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: focused ? B.amber : B.textLight, pointerEvents: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
      {preview && (
        <p style={{ marginTop: 6, fontSize: 11, color: B.textLight, fontWeight: 600, margin: '6px 0 0' }}>{preview}</p>
      )}
    </div>
  );
}

/* ── CellInput ── */
function CellInput({ value, onChange, placeholder, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      border: `1.5px solid ${focused ? B.amber : B.border}`,
      borderRadius: 4,
      background: focused ? '#fff' : '#fdf8f2',
      transition: 'all 0.15s',
      position: 'relative',
      boxShadow: focused ? `0 0 0 3px ${B.amber}15` : 'none',
    }}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          padding: suffix ? '9px 26px 9px 10px' : '9px 10px',
          fontSize: 13, fontWeight: 700, color: B.textDark,
          textAlign: 'center', fontFamily: 'inherit', caretColor: B.amber, boxSizing: 'border-box',
        }}
      />
      {suffix && (
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: B.textLight, pointerEvents: 'none' }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ── Mobile product card ── */
function ProductCard({ col, producto, calc, onChangeAporte, onChangePrecio }) {
  return (
    <div style={{ border: `1px solid ${B.borderLight}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      {/* card header */}
      <div style={{ background: B.terracotta, padding: '10px 16px' }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {col.sub}
        </p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {col.label}
        </p>
      </div>
      {/* fields */}
      <div style={{ padding: '14px 16px', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderBottom: `1px solid ${B.borderLight}` }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: B.amber, textTransform: 'uppercase', letterSpacing: '0.12em' }}>% Aporte Meta</p>
          <CellInput value={producto.aportePct} onChange={onChangeAporte} placeholder="50" suffix="%" />
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: B.amber, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Precio</p>
          <CellInput value={producto.precio} onChange={onChangePrecio} placeholder="90.000" />
        </div>
      </div>
      {/* calculated rows */}
      <div style={{ background: B.parchment }}>
        {[
          { label: 'Facturación', value: fmtCOP(calc.facturacion) },
          { label: 'Und Año',     value: fmtNum(calc.undAnio) },
          { label: 'Und Mes',     value: fmtNum(calc.undMes) },
          { label: 'Und Semana',  value: fmtNum(calc.undSemana) },
          { label: 'Und Día',     value: fmtNum(calc.undDia) },
        ].map(({ label, value }, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 16px',
            borderTop: `1px solid ${B.borderLight}`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: B.textLight }}>
              {label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: B.textDark, fontVariantNumeric: 'tabular-nums' }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main ── */
export default function WorkshopPro() {
  const isMobile = useIsMobile();
  const [facturacion, setFacturacion] = useState('');
  const [utilidadPct, setUtilidadPct] = useState('');
  const [productos, setProductos] = useState([
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

  const hasData = facturacionVal > 0;

  const cellRows = [
    productos.map((p, i) => <CellInput key={i} value={p.aportePct} onChange={v => setProducto(i, 'aportePct', v)} placeholder="50" suffix="%" />),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 700, color: B.textDark }}>{fmtCOP(c.facturacion)}</span>),
    productos.map((p, i) => <CellInput key={i} value={p.precio} onChange={v => setProducto(i, 'precio', formatThousands(v))} placeholder="90.000" />),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 700, color: B.textDark }}>{fmtNum(c.undAnio)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 700, color: B.textDark }}>{fmtNum(c.undMes)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 700, color: B.textDark }}>{fmtNum(c.undSemana)}</span>),
    calcs.map((c, i) => <span key={i} style={{ fontSize: 13, fontWeight: 700, color: B.textDark }}>{fmtNum(c.undDia)}</span>),
  ];

  const px = isMobile ? '16px' : '24px';

  return (
    <div style={{ minHeight: '100vh', background: B.parchment, fontFamily: 'DM Sans, system-ui, sans-serif', color: B.textDark }}>

      {/* ── HEADER ── */}
      <header style={{ background: GRAD, padding: `0 ${px}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '28px 0 24px' : '36px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', margin: 0, textAlign: 'center' }}>
            Workshop · Crecimiento Empresarial
          </p>
          <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 'clamp(28px,5vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
            Finanzas Sabias
          </h1>
          <div style={{ width: 48, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 1, margin: '6px 0' }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
            @dianacortesceo
          </p>
        </div>
      </header>

      {/* ── BODY ── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '44px 24px 72px' }}>

        {/* ── BLOCK 1: datos financieros ── */}
        <div style={{ background: '#fff', border: `1px solid ${B.borderLight}`, borderRadius: 10, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: `14px ${px}`, borderBottom: `1px solid ${B.borderLight}`, display: 'flex', alignItems: 'center', gap: 10, background: B.parchment }}>
            <div style={{ width: 4, height: 16, borderRadius: 2, background: B.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: B.labelColor }}>
              Datos financieros
            </span>
          </div>

          <div style={{ padding: isMobile ? '20px 16px' : '24px' }}>
            {/* inputs — 1 col on mobile, 2 on desktop */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <Field label="Facturación del Año" value={facturacion} onChange={v => setFacturacion(formatThousands(v))} placeholder="100.000.000" preview={hasData ? fmtCOP(facturacionVal) : null} />
              <Field label="% Utilidad" value={utilidadPct} onChange={setUtilidadPct} placeholder="40" suffix="%" />
            </div>

            {/* metrics — stack on mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: '% Utilidad',    value: utilidadPctVal ? `${utilidadPctVal}%` : '', highlight: false },
                { label: 'Utilidad Año',  value: fmtCOP(utilidadAnio), highlight: true  },
                { label: 'Utilidad Mes',  value: fmtCOP(utilidadMes),  highlight: true  },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={{ border: `1px solid ${B.borderLight}`, borderRadius: 8, padding: '16px 20px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: B.textLight }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: isMobile ? 20 : 18, fontWeight: 800, color: highlight ? B.amber : B.textDark, fontVariantNumeric: 'tabular-nums' }}>
                    {value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BLOCK 2: escenario ── */}
        <div style={{ background: '#fff', border: `1px solid ${B.borderLight}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>

          {/* banner */}
          <div style={{ background: B.terracotta, padding: isMobile ? '14px 16px' : '16px 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Calculadora</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Escenario Pesimista</p>
              </div>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right', paddingLeft: isMobile ? 16 : 0 }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>
                Meta Facturación Año
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {hasData ? fmtCOP(facturacionVal) : '—'}
              </p>
            </div>
          </div>

          {/* MOBILE: product cards */}
          {isMobile ? (
            <div style={{ padding: '16px' }}>
              {COLS.map((col, i) => (
                <ProductCard
                  key={col.key}
                  col={col}
                  producto={productos[i]}
                  calc={calcs[i]}
                  onChangeAporte={v => setProducto(i, 'aportePct', v)}
                  onChangePrecio={v => setProducto(i, 'precio', formatThousands(v))}
                />
              ))}
            </div>
          ) : (
            /* DESKTOP: full table */
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 580 }}>
                  <thead>
                    <tr style={{ background: B.parchment }}>
                      <th style={{ border: `1px solid ${B.borderLight}`, padding: '12px 20px', width: 180, textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: B.textLight }}>
                        Métrica
                      </th>
                      {COLS.map(col => (
                        <th key={col.key} style={{ border: `1px solid ${B.borderLight}`, padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: B.terracotta }}>
                          {col.label}
                          <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: B.textLight, letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
                            {col.sub}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROW_LABELS.map((label, ri) => {
                      const isInput = INPUT_ROWS.has(ri);
                      return (
                        <tr key={ri} style={{ background: isInput ? '#fdf5ec' : (ri % 2 === 0 ? '#fff' : '#fdf8f4') }}>
                          <td style={{ border: `1px solid ${B.borderLight}`, padding: '10px 20px', fontSize: 11, fontWeight: isInput ? 800 : 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: isInput ? B.amber : B.textLight, borderLeft: isInput ? `3px solid ${B.amber}` : `1px solid ${B.borderLight}` }}>
                            {label}
                          </td>
                          {cellRows[ri].map((cell, ci) => (
                            <td key={ci} style={{ border: `1px solid ${B.borderLight}`, padding: isInput ? '7px 12px' : '10px 12px', textAlign: 'center' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 24px', borderTop: `1px solid ${B.borderLight}`, background: B.parchment }}>
                <p style={{ margin: 0, fontSize: 10, color: B.textLight, fontWeight: 500 }}>
                  ✦ Las filas resaltadas son de ingreso. El resto se calcula automáticamente.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── CTA ── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handlePrint}
            disabled={!hasData}
            onMouseEnter={e => { if (hasData) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isMobile ? '14px 28px' : '14px 36px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              borderRadius: 7, border: 'none',
              background: hasData ? GRAD : B.borderLight,
              color: hasData ? '#fff' : B.textLight,
              fontSize: 11, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.18em',
              cursor: hasData ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: hasData ? '0 4px 18px rgba(126,48,31,0.3)' : 'none',
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Imprimir / Descargar PDF
          </button>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{ background: GRAD, padding: isMobile ? '18px 16px' : '20px 40px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 6 : 0, textAlign: isMobile ? 'center' : 'left' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Workshop · Crecimiento Empresarial
        </p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          @dianacortesceo
        </p>
      </footer>

    </div>
  );
}
