/**
 * Opens a new window with the report content and triggers print dialog.
 * This approach is more reliable than trying to hide/show elements with CSS.
 * 
 * @param {string} htmlContent - The HTML content to print
 * @param {string} title - The document title
 */
export function printReport(htmlContent, title = 'Informe Financiero') {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir el informe.');
    return;
  }

  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: white;
        color: #1a1a1a;
        line-height: 1.5;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .print-report {
        max-width: 1100px;
        margin: 0 auto;
        padding: 40px;
        background: white;
      }

      /* Header */
      .print-report-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 24px;
        margin-bottom: 32px;
        border-bottom: 4px solid #da7d41;
      }

      .print-report-title {
        font-size: 32px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
      }

      .print-report-subtitle {
        font-size: 16px;
        color: #666;
        margin-top: 4px;
      }

      /* Sections */
      section {
        margin-bottom: 32px;
      }

      section h2 {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e5e5e5;
      }

      section h3 {
        font-size: 14px;
        font-weight: 600;
        color: #444;
        margin: 24px 0 12px;
      }

      /* Stats Grid */
      .grid {
        display: grid;
        gap: 16px;
      }

      .grid-cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }

      .print-stat-card {
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        page-break-inside: avoid;
      }

      .print-stat-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #666;
        margin-bottom: 8px;
      }

      .print-stat-value {
        font-size: 24px;
        font-weight: 700;
        margin: 8px 0;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin-bottom: 16px;
      }

      th, td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid #e5e5e5;
      }

      th {
        background: #f8f8f8;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.5px;
        color: #555;
      }

      thead tr {
        background: #f8f8f8;
      }

      tfoot tr {
        background: #f8f8f8;
        font-weight: 700;
      }

      .text-right {
        text-align: right;
      }

      .text-center {
        text-align: center;
      }

      /* Colors */
      .text-green-600 { color: #059669; }
      .text-red-600 { color: #dc2626; }
      .text-gray-900 { color: #1a1a1a; }
      .text-gray-600 { color: #666; }
      .text-gray-500 { color: #888; }
      
      .bg-green-50 { background-color: #f0fdf4; }
      .bg-red-50 { background-color: #fef2f2; }
      .bg-green-100 { background-color: #dcfce7; }
      .bg-red-100 { background-color: #fee2e2; }
      .bg-amber-100 { background-color: #fef3c7; }
      
      .text-green-700 { color: #15803d; }
      .text-red-700 { color: #b91c1c; }
      .text-amber-700 { color: #b45309; }

      .border-green-200 { border-color: #bbf7d0; }
      .border-red-200 { border-color: #fecaca; }
      .border-green-300 { border-color: #86efac; }
      .border-red-300 { border-color: #fca5a5; }

      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }

      /* Inline badges */
      .inline-block {
        display: inline-block;
      }

      .px-1\\.5 { padding-left: 6px; padding-right: 6px; }
      .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
      .rounded { border-radius: 4px; }

      /* Footer */
      footer {
        margin-top: 48px;
        padding-top: 24px;
        border-top: 2px solid #e5e5e5;
        text-align: center;
        font-size: 11px;
        color: #888;
      }

      /* Utility */
      .flex { display: flex; }
      .items-start { align-items: flex-start; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 8px; }
      .gap-4 { gap: 16px; }
      .mb-2 { margin-bottom: 8px; }
      .mb-4 { margin-bottom: 16px; }
      .mb-6 { margin-bottom: 24px; }
      .mb-8 { margin-bottom: 32px; }
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .mt-4 { margin-top: 16px; }
      .mt-6 { margin-top: 24px; }
      .mt-12 { margin-top: 48px; }
      .pt-2 { padding-top: 8px; }
      .pt-6 { padding-top: 24px; }
      .pb-2 { padding-bottom: 8px; }
      .pb-6 { padding-bottom: 24px; }
      .p-4 { padding: 16px; }
      .px-2 { padding-left: 8px; padding-right: 8px; }
      .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .py-3 { padding-top: 12px; padding-bottom: 12px; }
      .px-3 { padding-left: 12px; padding-right: 12px; }
      .px-4 { padding-left: 16px; padding-right: 16px; }

      .w-3 { width: 12px; }
      .h-3 { height: 12px; }
      .rounded-full { border-radius: 9999px; }

      .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .max-w-\\[200px\\] { max-width: 200px; }

      .border-b { border-bottom: 1px solid #e5e5e5; }
      .border-b-2 { border-bottom: 2px solid #e5e5e5; }
      .border-b-4 { border-bottom: 4px solid #da7d41; }
      .border-t-2 { border-top: 2px solid #e5e5e5; }
      .border-2 { border: 2px solid #e5e5e5; }

      .border-gray-100 { border-color: #f3f4f6; }
      .border-gray-200 { border-color: #e5e5e5; }

      .text-xs { font-size: 11px; }
      .text-sm { font-size: 13px; }
      .text-lg { font-size: 18px; }
      .text-xl { font-size: 20px; }
      .text-2xl { font-size: 24px; }
      .text-3xl { font-size: 32px; }

      .uppercase { text-transform: uppercase; }
      .tracking-wide { letter-spacing: 0.5px; }

      /* Brand color */
      .text-\\[\\#da7d41\\] { color: #da7d41; }
      .text-\\[\\#b45309\\] { color: #b45309; }
      .border-\\[\\#da7d41\\] { border-color: #da7d41; }
      .bg-\\[\\#fef3e2\\] { background-color: #fef3e2; }

      /* Print specific */
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .print-report {
          padding: 0;
          max-width: none;
        }

        .print-page-break {
          page-break-before: always;
        }

        .print-avoid-break {
          page-break-inside: avoid;
        }

        @page {
          margin: 1.5cm;
          size: A4 landscape;
        }
      }
    </style>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      ${styles}
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        /* ventana cerrada u otro error del navegador */
      }
    }, 80);
  };

  const waitForImagesThenPrint = () => {
    const imgs = Array.from(printWindow.document.images);
    const pending = imgs.filter((img) => !img.complete);
    if (pending.length === 0) {
      runPrint();
      return;
    }
    let left = pending.length;
    const oneDone = () => {
      left -= 1;
      if (left <= 0) runPrint();
    };
    pending.forEach((img) => {
      img.addEventListener('load', oneDone, { once: true });
      img.addEventListener('error', oneDone, { once: true });
    });
    setTimeout(runPrint, 4500);
  };

  if (printWindow.document.readyState === 'complete') {
    waitForImagesThenPrint();
  } else {
    printWindow.addEventListener('load', waitForImagesThenPrint, { once: true });
  }
}
