import { forwardRef } from 'react';
import { formatCurrency } from '../utils/formatters';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const PrintReportMonthly = forwardRef(({ 
  data,
  month,
  year,
  currency = 'COP',
  companyName = 'Finanzas Sabias',
  userName = '',
}, ref) => {
  const {
    budgetOverview,
    totalIncome,
    totalExpense,
    incomeByType,
    expenseByCategory,
    incomes,
    expenses,
  } = data;

  const utilidadReal = totalIncome - totalExpense;
  const totalPocketsPct = budgetOverview?.pockets?.reduce((s, p) => s + (p.percentage || 0), 0) || 0;
  const utilidadProyectadaPct = Math.max(0, 100 - totalPocketsPct);
  const utilidadProyectada = budgetOverview?.monthly_estimate * utilidadProyectadaPct / 100 || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div ref={ref} className="print-report bg-white text-black p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="print-report-header flex items-start justify-between pb-6 mb-6 border-b-4 border-[#da7d41]">
        <div>
          <h1 className="print-report-title text-3xl font-bold text-gray-900">
            Informe Financiero Mensual
          </h1>
          <p className="print-report-subtitle text-gray-600 mt-1">
            {MONTH_NAMES[month]} {year}
          </p>
          {userName && (
            <p className="text-sm text-gray-500 mt-2">Preparado para: {userName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-[#da7d41]">{companyName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Generado: {new Date().toLocaleDateString('es-CO', { 
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="mb-8 print-avoid-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Resumen Ejecutivo
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Meta del Mes</p>
            <p className="print-stat-value text-2xl font-bold text-[#b45309]">
              {formatCurrency(budgetOverview?.monthly_estimate || 0, currency)}
            </p>
          </div>
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Ingresos</p>
            <p className="print-stat-value text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome, currency)}
            </p>
            <p className="text-xs text-gray-500">
              {budgetOverview?.monthly_estimate > 0 
                ? `${((totalIncome / budgetOverview.monthly_estimate) * 100).toFixed(1)}% de la meta`
                : '—'
              }
            </p>
          </div>
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Gastos</p>
            <p className="print-stat-value text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense, currency)}
            </p>
            <p className="text-xs text-gray-500">
              {budgetOverview?.total_budget > 0 
                ? `${((totalExpense / budgetOverview.total_budget) * 100).toFixed(1)}% del presupuesto`
                : '—'
              }
            </p>
          </div>
          <div className={`print-stat-card border-2 rounded-lg p-4 text-center ${
            utilidadReal >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Utilidad</p>
            <p className={`print-stat-value text-2xl font-bold ${utilidadReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {utilidadReal >= 0 ? '' : '-'}{formatCurrency(Math.abs(utilidadReal), currency)}
            </p>
            <p className="text-xs text-gray-500">
              Proyectada: {formatCurrency(utilidadProyectada, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Income Breakdown */}
      <section className="mb-8 print-avoid-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Distribución de Ingresos
        </h2>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo de Ingreso</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Monto</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">% del Total</th>
            </tr>
          </thead>
          <tbody>
            {incomeByType.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-3 px-4 font-medium">{item.name}</td>
                <td className="py-3 px-4 text-right text-green-600 font-semibold">
                  {formatCurrency(item.value, currency)}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="py-3 px-4">TOTAL INGRESOS</td>
              <td className="py-3 px-4 text-right text-green-600">{formatCurrency(totalIncome, currency)}</td>
              <td className="py-3 px-4 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Expense Breakdown */}
      <section className="mb-8 print-avoid-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Distribución de Gastos
        </h2>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Monto</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">% del Total</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Presupuesto</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {expenseByCategory.map((item, i) => {
              const pocket = budgetOverview?.pockets?.find(p => p.name === item.name);
              const budget = pocket?.budget_value || 0;
              const isOver = budget > 0 && item.value > budget;
              return (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-semibold">
                    {formatCurrency(item.value, currency)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.percentage}%</td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {budget > 0 ? formatCurrency(budget, currency) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {budget > 0 && (
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        isOver ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {isOver ? 'Excedido' : 'OK'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="py-3 px-4">TOTAL GASTOS</td>
              <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totalExpense, currency)}</td>
              <td className="py-3 px-4 text-right">100%</td>
              <td className="py-3 px-4 text-right text-gray-500">
                {formatCurrency(budgetOverview?.total_budget || 0, currency)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Budget Execution */}
      {budgetOverview?.pockets?.length > 0 && (
        <section className="mb-8 print-page-break">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
            Ejecución Presupuestaria
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Bolsillo</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">% Asignado</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Presup. Mensual</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Gasto Real</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Ejecución</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Desviación</th>
              </tr>
            </thead>
            <tbody>
              {budgetOverview.pockets.map((p, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-3 px-3 font-medium">{p.name}</td>
                  <td className="py-3 px-3 text-right text-[#b45309]">{p.percentage}%</td>
                  <td className="py-3 px-3 text-right">{formatCurrency(p.budget_value, currency)}</td>
                  <td className={`py-3 px-3 text-right font-semibold ${
                    p.actual_value > p.budget_value ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(p.actual_value, currency)}
                  </td>
                  <td className="py-3 px-3 text-right">{p.percentage_real}%</td>
                  <td className={`py-3 px-3 text-right font-semibold ${
                    p.deviation_amount > 0 ? 'text-red-600' : p.deviation_amount < 0 ? 'text-green-600' : ''
                  }`}>
                    {p.deviation_amount > 0 ? '+' : ''}{formatCurrency(p.deviation_amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="py-3 px-3">TOTAL</td>
                <td className="py-3 px-3 text-right text-[#b45309]">{totalPocketsPct}%</td>
                <td className="py-3 px-3 text-right">{formatCurrency(budgetOverview.total_budget, currency)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(budgetOverview.total_actual_expenses, currency)}</td>
                <td className="py-3 px-3 text-right">
                  {budgetOverview.total_budget > 0 
                    ? `${((budgetOverview.total_actual_expenses / budgetOverview.total_budget) * 100).toFixed(1)}%` 
                    : '—'
                  }
                </td>
                <td className={`py-3 px-3 text-right ${
                  budgetOverview.total_actual_expenses > budgetOverview.total_budget ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(budgetOverview.total_actual_expenses - budgetOverview.total_budget, currency)}
                </td>
              </tr>
              <tr className="bg-[#fef3e2]">
                <td className="py-3 px-3 font-semibold text-[#b45309]">Utilidad Proyectada</td>
                <td className="py-3 px-3 text-right text-[#b45309]">{utilidadProyectadaPct}%</td>
                <td className="py-3 px-3 text-right text-[#b45309] font-semibold">{formatCurrency(utilidadProyectada, currency)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Transaction Details */}
      <section className="print-page-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Detalle de Transacciones
        </h2>
        
        {/* Incomes */}
        <h3 className="text-md font-semibold text-gray-700 mt-6 mb-3">Ingresos ({incomes.length})</h3>
        <table className="w-full text-xs mb-6">
          <thead>
            <tr className="bg-green-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Factura</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Cliente</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Tipo</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Monto</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {incomes.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-center text-gray-500">Sin ingresos registrados</td></tr>
            ) : (
              [...incomes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-2 px-2">{t.invoice_number || '—'}</td>
                  <td className="py-2 px-2 font-medium">{t.client_name || '—'}</td>
                  <td className="py-2 px-2">{t.category || '—'}</td>
                  <td className="py-2 px-2 text-right text-green-600 font-semibold">{formatCurrency(t.amount, currency)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${
                      t.invoice_status === 'FACTURADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.invoice_status === 'FACTURADO' ? 'FAC' : 'NO FAC'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {incomes.length > 0 && (
            <tfoot>
              <tr className="bg-green-50 font-bold">
                <td colSpan={4} className="py-2 px-2">TOTAL INGRESOS</td>
                <td className="py-2 px-2 text-right text-green-600">{formatCurrency(totalIncome, currency)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Expenses */}
        <h3 className="text-md font-semibold text-gray-700 mt-6 mb-3">Gastos ({expenses.length})</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-red-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Fecha</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Proveedor</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Categoría</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-600">Método Pago</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-600">Monto</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-center text-gray-500">Sin gastos registrados</td></tr>
            ) : (
              [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-2 px-2 font-medium">{t.provider_name || '—'}</td>
                  <td className="py-2 px-2">{t.category || '—'}</td>
                  <td className="py-2 px-2">{t.payment_method || '—'}</td>
                  <td className="py-2 px-2 text-right text-red-600 font-semibold">{formatCurrency(t.amount, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="bg-red-50 font-bold">
                <td colSpan={4} className="py-2 px-2">TOTAL GASTOS</td>
                <td className="py-2 px-2 text-right text-red-600">{formatCurrency(totalExpense, currency)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-200 text-center text-xs text-gray-500">
        <p>{companyName} — Informe Financiero Mensual — {MONTH_NAMES[month]} {year}</p>
        <p className="mt-1">Documento generado automáticamente. Página 1</p>
      </footer>
    </div>
  );
});

PrintReportMonthly.displayName = 'PrintReportMonthly';

export const PrintReportAnnual = forwardRef(({ 
  data,
  year,
  currency = 'COP',
  companyName = 'Finanzas Sabias',
  userName = '',
}, ref) => {
  const { monthlyData, totals, categoryTotals } = data;

  return (
    <div ref={ref} className="print-report bg-white text-black p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="print-report-header flex items-start justify-between pb-6 mb-6 border-b-4 border-[#da7d41]">
        <div>
          <h1 className="print-report-title text-3xl font-bold text-gray-900">
            Informe Financiero Anual
          </h1>
          <p className="print-report-subtitle text-gray-600 mt-1">
            Año Fiscal {year}
          </p>
          {userName && (
            <p className="text-sm text-gray-500 mt-2">Preparado para: {userName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-[#da7d41]">{companyName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Generado: {new Date().toLocaleDateString('es-CO', { 
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* Annual Summary */}
      <section className="mb-8 print-avoid-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Resumen Anual
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Total Ingresos</p>
            <p className="print-stat-value text-2xl font-bold text-green-600">
              {formatCurrency(totals.income, currency)}
            </p>
          </div>
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Total Gastos</p>
            <p className="print-stat-value text-2xl font-bold text-red-600">
              {formatCurrency(totals.expense, currency)}
            </p>
          </div>
          <div className={`print-stat-card border-2 rounded-lg p-4 text-center ${
            totals.profit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Utilidad Neta</p>
            <p className={`print-stat-value text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.profit >= 0 ? '' : '-'}{formatCurrency(Math.abs(totals.profit), currency)}
            </p>
          </div>
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Margen</p>
            <p className={`print-stat-value text-2xl font-bold ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.margin.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>

      {/* Monthly Breakdown */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Desempeño Mensual
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Mes</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600">Ingresos</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600">Gastos</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600">Utilidad</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-600">Margen</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-3 px-3 font-medium">{MONTH_NAMES[i]}</td>
                <td className="py-3 px-3 text-right text-green-600">{formatCurrency(m.income, currency)}</td>
                <td className="py-3 px-3 text-right text-red-600">{formatCurrency(m.expense, currency)}</td>
                <td className={`py-3 px-3 text-right font-semibold ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.profit >= 0 ? '' : '-'}{formatCurrency(Math.abs(m.profit), currency)}
                </td>
                <td className={`py-3 px-3 text-right ${m.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.margin.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="py-3 px-3">TOTAL ANUAL</td>
              <td className="py-3 px-3 text-right text-green-600">{formatCurrency(totals.income, currency)}</td>
              <td className="py-3 px-3 text-right text-red-600">{formatCurrency(totals.expense, currency)}</td>
              <td className={`py-3 px-3 text-right ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.profit >= 0 ? '' : '-'}{formatCurrency(Math.abs(totals.profit), currency)}
              </td>
              <td className={`py-3 px-3 text-right ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.margin.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Category Breakdown */}
      {categoryTotals && (
        <section className="print-page-break">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
            Análisis por Categoría
          </h2>
          
          {/* Income Categories */}
          <h3 className="text-md font-semibold text-gray-700 mt-4 mb-3">Ingresos por Tipo</h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-green-50">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Categoría</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Total Anual</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">% del Total</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Promedio Mensual</th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.income.map((c, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{c.name}</td>
                  <td className="py-2 px-3 text-right text-green-600 font-semibold">{formatCurrency(c.total, currency)}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{c.percentage.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right text-gray-500">{formatCurrency(c.total / 12, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expense Categories */}
          <h3 className="text-md font-semibold text-gray-700 mt-4 mb-3">Gastos por Categoría</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Categoría</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Total Anual</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">% del Total</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Promedio Mensual</th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.expense.map((c, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{c.name}</td>
                  <td className="py-2 px-3 text-right text-red-600 font-semibold">{formatCurrency(c.total, currency)}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{c.percentage.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right text-gray-500">{formatCurrency(c.total / 12, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-200 text-center text-xs text-gray-500">
        <p>{companyName} — Informe Financiero Anual — {year}</p>
        <p className="mt-1">Documento generado automáticamente</p>
      </footer>
    </div>
  );
});

PrintReportAnnual.displayName = 'PrintReportAnnual';

export const PrintTransactions = forwardRef(({ 
  transactions,
  summary,
  period,
  currency = 'COP',
  companyName = 'Finanzas Sabias',
  userName = '',
}, ref) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');
  const transfers = transactions.filter((t) => t.type === 'transfer');

  return (
    <div ref={ref} className="print-report bg-white text-black p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="print-report-header flex items-start justify-between pb-6 mb-6 border-b-4 border-[#da7d41]">
        <div>
          <h1 className="print-report-title text-3xl font-bold text-gray-900">
            Reporte de Transacciones
          </h1>
          <p className="print-report-subtitle text-gray-600 mt-1">{period}</p>
          {userName && (
            <p className="text-sm text-gray-500 mt-2">Preparado para: {userName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-[#da7d41]">{companyName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Generado: {new Date().toLocaleDateString('es-CO', { 
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <section className="mb-8 print-avoid-break">
        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
          Resumen del Período
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="print-stat-card border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Total Transacciones</p>
            <p className="print-stat-value text-2xl font-bold text-gray-900">
              {transactions.length}
            </p>
          </div>
          <div className="print-stat-card border-2 border-green-200 bg-green-50 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Total Ingresos</p>
            <p className="print-stat-value text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome, currency)}
            </p>
            <p className="text-xs text-gray-500">{incomes.length} transacciones</p>
          </div>
          <div className="print-stat-card border-2 border-red-200 bg-red-50 rounded-lg p-4 text-center">
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Total Gastos</p>
            <p className="print-stat-value text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpense, currency)}
            </p>
            <p className="text-xs text-gray-500">{expenses.length} transacciones</p>
          </div>
          <div className={`print-stat-card border-2 rounded-lg p-4 text-center ${
            summary.balance >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <p className="print-stat-label text-xs uppercase text-gray-500 tracking-wide">Balance</p>
            <p className={`print-stat-value text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(summary.balance), currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Incomes Table */}
      {incomes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-green-200 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Ingresos ({incomes.length})
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-green-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Factura</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Tipo</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Descripción</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">Monto</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {[...incomes].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-2 px-2">{t.invoice_number || '—'}</td>
                  <td className="py-2 px-2 font-medium">{t.client_name || '—'}</td>
                  <td className="py-2 px-2">{t.category || '—'}</td>
                  <td className="py-2 px-2 text-gray-600 max-w-[200px] truncate">{t.description || '—'}</td>
                  <td className="py-2 px-2 text-right text-green-600 font-semibold">{formatCurrency(t.amount, currency)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] rounded ${
                      t.invoice_status === 'FACTURADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.invoice_status === 'FACTURADO' ? 'FAC' : 'NO FAC'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-green-50 font-bold">
                <td colSpan={5} className="py-2 px-2">TOTAL INGRESOS</td>
                <td className="py-2 px-2 text-right text-green-600">{formatCurrency(summary.totalIncome, currency)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Expenses Table */}
      {expenses.length > 0 && (
        <section className="mb-8 print-page-break">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-red-200 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Gastos ({expenses.length})
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-red-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Proveedor</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Categoría</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Descripción</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Método Pago</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-2 px-2 font-medium">{t.provider_name || '—'}</td>
                  <td className="py-2 px-2">{t.category || '—'}</td>
                  <td className="py-2 px-2 text-gray-600 max-w-[200px] truncate">{t.description || '—'}</td>
                  <td className="py-2 px-2">{t.payment_method || '—'}</td>
                  <td className="py-2 px-2 text-right text-red-600 font-semibold">{formatCurrency(t.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 font-bold">
                <td colSpan={5} className="py-2 px-2">TOTAL GASTOS</td>
                <td className="py-2 px-2 text-right text-red-600">{formatCurrency(summary.totalExpense, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Transfers Table */}
      {transfers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Transferencias ({transfers.length})
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Desde</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Hacia</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Descripción</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {[...transfers].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-2 px-2">{t.source_account || '—'}</td>
                  <td className="py-2 px-2">{t.destination_account || '—'}</td>
                  <td className="py-2 px-2 text-gray-600 max-w-[200px] truncate">{t.description || '—'}</td>
                  <td className="py-2 px-2 text-right text-blue-600 font-semibold">{formatCurrency(t.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-200 text-center text-xs text-gray-500">
        <p>{companyName} — Reporte de Transacciones — {period}</p>
        <p className="mt-1">Documento generado automáticamente</p>
      </footer>
    </div>
  );
});

PrintTransactions.displayName = 'PrintTransactions';
