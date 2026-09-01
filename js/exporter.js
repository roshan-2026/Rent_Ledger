/**
 * Document Exporter for Rent & Utility Split Manager
 * Strictly isolates and exports the generated bill statement:
 * - A4 Invoice PDF (100% Non-blank, captured with layout stabilization)
 * - Formatted Excel Spreadsheet (.xls / .csv) without column clipping (No "###")
 * - Isolated 1-Page Iframe Printing (Zero blank pages)
 * - Complete Payment Transaction History Ledger
 */

const Calc = (typeof window !== 'undefined' && window.Calculator) ? window.Calculator : (typeof Calculator !== 'undefined' ? Calculator : {});

const Exporter = {
  /**
   * Generates the pure HTML string of the standalone A4 Invoice.
   * Used for both PDF generation and isolated iframe printing.
   */
  getInvoiceHTML(reportData) {
    if (!reportData || !reportData.allPersons) return '';

    const curr = reportData.currency || '₹';
    const propName = reportData.propertyName || 'Rental Property / Booking';
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const samplePerson = reportData.allPersons[0] || {};
    const startDateFormatted = Calc.formatDate ? Calc.formatDate(samplePerson.startDate) : (samplePerson.startDate || 'N/A');
    const endDateFormatted = Calc.formatDate ? Calc.formatDate(samplePerson.endDate) : (samplePerson.endDate || 'N/A');
    const months = samplePerson.months || 1;
    const invId = `INV-${Date.now().toString().slice(-6)}`;

    const totalPaid = reportData.allPersons.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalBalance = reportData.allPersons.reduce((sum, p) => sum + (p.balance || 0), 0);

    let rowsHtml = '';
    let transactionsHtml = '';

    reportData.allPersons.forEach((p, idx) => {
      const statusBadge = p.status === 'paid' 
        ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:2px 7px; border-radius:10px; font-size:7.5pt; font-weight:700;">PAID</span>`
        : (p.status === 'partial'
          ? `<span style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; padding:2px 7px; border-radius:10px; font-size:7.5pt; font-weight:700;">PARTIAL</span>`
          : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 7px; border-radius:10px; font-size:7.5pt; font-weight:700;">UNPAID</span>`);

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 8.5pt;">
          <td style="padding: 7px 8px; font-weight: 700; color: #0f172a;">
            ${p.name || `Occupant ${idx + 1}`}
            <div style="font-size: 7.2pt; font-weight: 400; color: #64748b;">${p.roomName} • ${p.splitMode === 'income' ? `Income: ${curr}${p.income ? p.income.toLocaleString() : 0} (${p.incomePercentage})` : 'Equal Share'}</div>
          </td>
          <td style="padding: 7px 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(p.rentShareTotal, curr) : p.rentShareTotal}</td>
          <td style="padding: 7px 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(p.depositShare, curr) : p.depositShare}</td>
          <td style="padding: 7px 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(p.electricityShare, curr) : p.electricityShare}</td>
          <td style="padding: 7px 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(p.waterShare, curr) : p.waterShare}</td>
          <td style="padding: 7px 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(p.internetShare + p.otherServicesShare, curr) : (p.internetShare + p.otherServicesShare)}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #4f46e5;">${Calc.formatCurrency ? Calc.formatCurrency(p.totalDue, curr) : p.totalDue}</td>
          <td style="padding: 7px 8px; text-align: right; color: #059669; font-weight: 600;">${Calc.formatCurrency ? Calc.formatCurrency(p.amountPaid, curr) : p.amountPaid}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: ${p.balance > 0 ? '#dc2626' : '#059669'};">${Calc.formatCurrency ? Calc.formatCurrency(p.balance, curr) : p.balance}</td>
          <td style="padding: 7px 8px; text-align: center;">${statusBadge}</td>
        </tr>
      `;

      // Build transaction statement entries if any exist
      if (Array.isArray(p.payments) && p.payments.length > 0) {
        p.payments.forEach(tx => {
          transactionsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9; font-size: 8pt;">
              <td style="padding: 5px 8px; font-weight: 600;">${p.name} (${p.roomName})</td>
              <td style="padding: 5px 8px;">${Calc.formatDate ? Calc.formatDate(tx.date) : tx.date}</td>
              <td style="padding: 5px 8px; font-weight: 700; color: #059669; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(tx.amount, curr) : tx.amount}</td>
              <td style="padding: 5px 8px; text-align: center;">${tx.method || 'UPI'}</td>
            </tr>
          `;
        });
      }
    });

    return `
      <div class="invoice-page" style="background:#ffffff; color:#0f172a; font-family:'Inter', -apple-system, sans-serif; padding: 20px 24px; width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <h1 style="font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0 0 3px 0; letter-spacing: -0.02em;">RENT & UTILITY SPLIT STATEMENT</h1>
            <p style="font-size: 9.5pt; font-weight: 700; color: #4f46e5; margin: 0 0 2px 0;">Property / Unit: ${propName}</p>
            <p style="font-size: 8pt; color: #64748b; margin: 0;">Statement ID: ${invId} • Date: ${todayStr}</p>
          </div>
          <div style="text-align: right;">
            <span style="display:inline-block; background:#eef2ff; color:#4f46e5; font-size:7.5pt; font-weight:700; padding:2px 8px; border-radius:10px; margin-bottom:3px;">Official Statement</span>
            <p style="font-size: 8.5pt; font-weight: 600; color: #1e293b; margin: 0;">Period: ${startDateFormatted} to ${endDateFormatted}</p>
            <p style="font-size: 7.8pt; color: #64748b; margin: 0;">Stay: ${months} Month${months > 1 ? 's' : ''} • Occupants: ${reportData.allPersons.length}</p>
          </div>
        </div>

        <!-- Executive Financial Summary -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background:#f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 14px;">
          <div>
            <span style="font-size: 7pt; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Total Rent</span>
            <span style="font-size: 10.5pt; font-weight:800; color:#0f172a;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalRent, curr) : reportData.overallTotalRent}</span>
          </div>
          <div>
            <span style="font-size: 7pt; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Security Deposit</span>
            <span style="font-size: 10.5pt; font-weight:800; color:#0f172a;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalDeposit, curr) : reportData.overallTotalDeposit}</span>
          </div>
          <div>
            <span style="font-size: 7pt; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Total Utilities</span>
            <span style="font-size: 10.5pt; font-weight:800; color:#0f172a;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalUtilities, curr) : reportData.overallTotalUtilities}</span>
          </div>
          <div style="border-left: 2px solid #cbd5e1; padding-left: 8px;">
            <span style="font-size: 7pt; color:#4f46e5; text-transform:uppercase; font-weight:800; display:block;">Grand Total Due</span>
            <span style="font-size: 11.5pt; font-weight:800; color:#4f46e5;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallGrandTotal, curr) : reportData.overallGrandTotal}</span>
          </div>
        </div>

        <!-- Person-wise Itemized Table -->
        <table style="width:100%; border-collapse: collapse; margin-bottom: 14px;">
          <thead>
            <tr style="background:#f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1.5px solid #0f172a; font-size: 7.2pt; text-transform: uppercase; color: #475569;">
              <th style="padding: 6px 8px; text-align: left;">Occupant / Room</th>
              <th style="padding: 6px 8px; text-align: right;">Rent</th>
              <th style="padding: 6px 8px; text-align: right;">Deposit</th>
              <th style="padding: 6px 8px; text-align: right;">Elect.</th>
              <th style="padding: 6px 8px; text-align: right;">Water</th>
              <th style="padding: 6px 8px; text-align: right;">Wi-Fi/Misc</th>
              <th style="padding: 6px 8px; text-align: right;">Total Due</th>
              <th style="padding: 6px 8px; text-align: right;">Paid</th>
              <th style="padding: 6px 8px; text-align: right;">Balance</th>
              <th style="padding: 6px 8px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; font-size: 8.5pt; font-weight: 800;">
              <td style="padding: 8px;">OVERALL TOTALS</td>
              <td style="padding: 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalRent, curr) : reportData.overallTotalRent}</td>
              <td style="padding: 8px; text-align: right;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalDeposit, curr) : reportData.overallTotalDeposit}</td>
              <td style="padding: 8px; text-align: right;" colspan="3">Utilities: ${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallTotalUtilities, curr) : reportData.overallTotalUtilities}</td>
              <td style="padding: 8px; text-align: right; color:#4f46e5;">${Calc.formatCurrency ? Calc.formatCurrency(reportData.overallGrandTotal, curr) : reportData.overallGrandTotal}</td>
              <td style="padding: 8px; text-align: right; color:#059669;">${Calc.formatCurrency ? Calc.formatCurrency(totalPaid, curr) : totalPaid}</td>
              <td style="padding: 8px; text-align: right; color:${totalBalance > 0 ? '#dc2626' : '#059669'};">${Calc.formatCurrency ? Calc.formatCurrency(totalBalance, curr) : totalBalance}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- Transaction Statement Section (If payments recorded) -->
        ${transactionsHtml ? `
          <div style="margin-bottom: 14px;">
            <h4 style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 6px 0; letter-spacing: 0.04em;">
              💳 Recorded Payment Transaction Statements
            </h4>
            <table style="width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 4px;">
              <thead>
                <tr style="background: #f1f5f9; font-size: 7pt; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 5px 8px; text-align: left;">Occupant</th>
                  <th style="padding: 5px 8px; text-align: left;">Payment Date</th>
                  <th style="padding: 5px 8px; text-align: right;">Amount Paid</th>
                  <th style="padding: 5px 8px; text-align: center;">Method</th>
                </tr>
              </thead>
              <tbody>
                ${transactionsHtml}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Sign-off and Verification Footer -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size: 7.5pt; color: #64748b; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
          <div>
            <p style="margin: 0 0 2px 0;">• Calculated per room occupancy & individual service distribution rules.</p>
            <p style="margin: 0;">• Generated via RentSplit Pro Bill Management System.</p>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #0f172a; width: 140px; height: 24px; margin-bottom: 3px;"></div>
            <span>Authorized Signature / Stamp</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renders the standalone invoice HTML into a container
   */
  renderStandaloneInvoiceHTML(reportData, containerId = 'standalone-invoice-document') {
    const container = document.getElementById(containerId);
    if (!container) return null;
    container.innerHTML = this.getInvoiceHTML(reportData);
    return container;
  },

  /**
   * Export strictly the generated bill as a downloadable PDF document.
   * Uses a visible rendered modal frame so html2canvas never outputs blank.
   */
  exportToPDF(reportData, filename = 'Rent_Bill_Statement.pdf') {
    if (!reportData || !reportData.allPersons || reportData.allPersons.length === 0) {
      alert('Please calculate the bill before downloading PDF!');
      return;
    }

    const btn = document.getElementById('btn-download-pdf');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ Generating PDF...';

    // 1. Remember scroll position and temporarily scroll to top to prevent html2canvas offset bugs
    const prevScrollX = window.scrollX || window.pageXOffset || 0;
    const prevScrollY = window.scrollY || window.pageYOffset || 0;
    window.scrollTo(0, 0);

    // 2. Build dedicated capture stage at absolute top-left with guaranteed light theme colors
    const stage = document.createElement('div');
    stage.id = 'pdf-render-stage';
    stage.style.position = 'absolute';
    stage.style.left = '0px';
    stage.style.top = '0px';
    stage.style.width = '794px'; // Exactly A4 width at 96 DPI
    stage.style.background = '#ffffff';
    stage.style.color = '#0f172a';
    stage.style.zIndex = '9999999';
    stage.style.boxSizing = 'border-box';
    stage.style.margin = '0';
    stage.style.padding = '0';
    stage.style.display = 'block';
    stage.style.visibility = 'visible';
    stage.style.opacity = '1';
    stage.innerHTML = this.getInvoiceHTML(reportData);

    document.body.appendChild(stage);

    let cleaned = false;
    let safetyTimer = null;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      if (stage && stage.parentNode) {
        stage.parentNode.removeChild(stage);
      }
      if (btn) btn.innerHTML = originalText;
      window.scrollTo(prevScrollX, prevScrollY);
    };

    // Safety fallback timeout: if PDF generation takes over 7s, fallback to print
    safetyTimer = setTimeout(() => {
      if (!cleaned) {
        console.warn('PDF export generation timed out, falling back to print');
        cleanup();
        this.printBill(reportData);
      }
    }, 7000);

    // 3. Allow DOM and fonts to settle, then render with html2pdf
    setTimeout(() => {
      if (typeof window.html2pdf === 'function') {
        const opt = {
          margin: [6, 6, 6, 6],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          enableLinks: false,
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            width: 794,
            windowWidth: 794,
            backgroundColor: '#ffffff',
            logging: false
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        window.html2pdf()
          .set(opt)
          .from(stage)
          .save()
          .then(() => {
            cleanup();
          })
          .catch(err => {
            console.warn('html2pdf direct download failed, falling back to print invoice:', err);
            cleanup();
            this.printBill(reportData);
          });
      } else {
        cleanup();
        this.printBill(reportData);
      }
    }, 250);
  },

  /**
   * Export strictly the bill statement as a formatted Excel Spreadsheet (.xls).
   * Uses Excel HTML/XML table format with wide auto-fitted columns so '###' never appears!
   */
  exportToCSV(reportData) {
    if (!reportData || !reportData.allPersons || reportData.allPersons.length === 0) {
      alert('Please calculate the bill before exporting!');
      return;
    }

    const curr = reportData.currency || '₹';
    const propName = reportData.propertyName || 'Rental Property / Booking';
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const samplePerson = reportData.allPersons[0] || {};
    const startDateFormatted = Calc.formatDate ? Calc.formatDate(samplePerson.startDate) : samplePerson.startDate;
    const endDateFormatted = Calc.formatDate ? Calc.formatDate(samplePerson.endDate) : samplePerson.endDate;
    const months = samplePerson.months || 1;

    const totalPaid = reportData.allPersons.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalBalance = reportData.allPersons.reduce((sum, p) => sum + (p.balance || 0), 0);

    let rowsXml = '';
    let txRowsXml = '';

    reportData.allPersons.forEach((p, idx) => {
      rowsXml += `
        <tr>
          <td style="font-weight:bold;">${p.name || `Occupant ${idx + 1}`}</td>
          <td>${p.roomName}</td>
          <td>${p.startDate}</td>
          <td>${p.endDate}</td>
          <td align="center">${p.months}</td>
          <td>${p.splitMode === 'income' ? 'Income Percentage' : 'Equal Split'}</td>
          <td align="right">${p.income ? p.income : 0}</td>
          <td align="center">${p.incomePercentage || 'N/A'}</td>
          <td align="right">${p.rentShareMonthly.toFixed(2)}</td>
          <td align="right" style="font-weight:bold;">${p.rentShareTotal.toFixed(2)}</td>
          <td align="right">${p.depositShare.toFixed(2)}</td>
          <td align="right">${p.electricityShare.toFixed(2)}</td>
          <td align="right">${p.waterShare.toFixed(2)}</td>
          <td align="right">${p.internetShare.toFixed(2)}</td>
          <td align="right">${p.otherServicesShare.toFixed(2)}</td>
          <td align="right">${p.utilitiesShareTotal.toFixed(2)}</td>
          <td align="right" style="font-weight:bold; color:#4f46e5;">${p.totalDue.toFixed(2)}</td>
          <td align="right" style="color:#059669;">${p.amountPaid.toFixed(2)}</td>
          <td align="right" style="font-weight:bold; color:${p.balance > 0 ? '#dc2626' : '#059669'};">${p.balance.toFixed(2)}</td>
          <td align="center" style="font-weight:bold;">${p.status.toUpperCase()}</td>
        </tr>
      `;

      if (Array.isArray(p.payments) && p.payments.length > 0) {
        p.payments.forEach(tx => {
          txRowsXml += `
            <tr>
              <td>${p.name}</td>
              <td>${p.roomName}</td>
              <td>${tx.date}</td>
              <td align="right" style="font-weight:bold; color:#059669;">${parseFloat(tx.amount || 0).toFixed(2)}</td>
              <td align="center">${tx.method || 'UPI'}</td>
            </tr>
          `;
        });
      }
    });

    // Excel HTML workbook with explicit column styling to prevent '###'
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rent Bill Statement</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Calibri, sans-serif; font-size: 11pt; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 12px; }
          td { border: 1px solid #cbd5e1; padding: 6px 12px; }
          .hdr-title { font-size: 16pt; font-weight: bold; color: #0f172a; }
          .summary-th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <table>
          <tr><td colspan="6" class="hdr-title">RENT & UTILITY SPLIT STATEMENT</td></tr>
          <tr><td style="font-weight:bold;">Property / Booking:</td><td colspan="5">${propName}</td></tr>
          <tr><td style="font-weight:bold;">Billing Period:</td><td colspan="5">${startDateFormatted} to ${endDateFormatted} (${months} Months)</td></tr>
          <tr><td style="font-weight:bold;">Date Generated:</td><td colspan="5">${todayStr}</td></tr>
          <tr><td style="font-weight:bold;">Total Occupants:</td><td colspan="5">${reportData.allPersons.length}</td></tr>
          <tr></tr>
        </table>

        <!-- Summary -->
        <table>
          <tr><th colspan="6" style="background-color:#1e293b;">EXECUTIVE FINANCIAL SUMMARY</th></tr>
          <tr class="summary-th">
            <th>Total Rent (${curr})</th>
            <th>Security Deposit (${curr})</th>
            <th>Total Utilities (${curr})</th>
            <th>Grand Total Due (${curr})</th>
            <th>Total Paid (${curr})</th>
            <th>Balance Due (${curr})</th>
          </tr>
          <tr>
            <td align="right">${reportData.overallTotalRent.toFixed(2)}</td>
            <td align="right">${reportData.overallTotalDeposit.toFixed(2)}</td>
            <td align="right">${reportData.overallTotalUtilities.toFixed(2)}</td>
            <td align="right" style="font-weight:bold; color:#4f46e5;">${reportData.overallGrandTotal.toFixed(2)}</td>
            <td align="right" style="color:#059669;">${totalPaid.toFixed(2)}</td>
            <td align="right" style="font-weight:bold; color:${totalBalance > 0 ? '#dc2626' : '#059669'};">${totalBalance.toFixed(2)}</td>
          </tr>
          <tr></tr>
        </table>

        <!-- Detailed Person-wise Table -->
        <table>
          <tr><th colspan="20" style="background-color:#1e293b;">DETAILED PERSON-WISE ITEMIZED BREAKDOWN</th></tr>
          <tr>
            <th style="min-width:140px;">Occupant Name</th>
            <th style="min-width:130px;">Room / Unit</th>
            <th style="min-width:100px;">Move-in Date</th>
            <th style="min-width:100px;">Stay Till Date</th>
            <th>Stay (Mo)</th>
            <th style="min-width:130px;">Split Mode</th>
            <th>Salary (${curr})</th>
            <th>Income Share</th>
            <th>Rent/Mo (${curr})</th>
            <th>Total Rent (${curr})</th>
            <th>Deposit (${curr})</th>
            <th>Elect. (${curr})</th>
            <th>Water (${curr})</th>
            <th>Internet (${curr})</th>
            <th>Other (${curr})</th>
            <th>Total Utilities (${curr})</th>
            <th>Total Due (${curr})</th>
            <th>Amount Paid (${curr})</th>
            <th>Balance Due (${curr})</th>
            <th>Status</th>
          </tr>
          ${rowsXml}
          <tr style="font-weight:bold; background-color:#f8fafc;">
            <td colspan="9">OVERALL TOTALS</td>
            <td align="right">${reportData.overallTotalRent.toFixed(2)}</td>
            <td align="right">${reportData.overallTotalDeposit.toFixed(2)}</td>
            <td colspan="4" align="right">Total Utilities: ${reportData.overallTotalUtilities.toFixed(2)}</td>
            <td></td>
            <td align="right" style="color:#4f46e5;">${reportData.overallGrandTotal.toFixed(2)}</td>
            <td align="right" style="color:#059669;">${totalPaid.toFixed(2)}</td>
            <td align="right" style="color:${totalBalance > 0 ? '#dc2626' : '#059669'};">${totalBalance.toFixed(2)}</td>
            <td></td>
          </tr>
        </table>

        ${txRowsXml ? `
          <br/>
          <table>
            <tr><th colspan="5" style="background-color:#059669;">RECORDED PAYMENT TRANSACTION LEDGER</th></tr>
            <tr>
              <th style="min-width:140px;">Occupant Name</th>
              <th style="min-width:130px;">Room / Unit</th>
              <th style="min-width:110px;">Payment Date</th>
              <th style="min-width:120px;">Amount Paid (${curr})</th>
              <th>Payment Method</th>
            </tr>
            ${txRowsXml}
          </table>
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const filename = `Rent_Bill_Statement_${new Date().toISOString().slice(0, 10)}.xls`;
    this._triggerDownload(blob, filename);
  },

  /**
   * Browser print trigger using an isolated hidden iframe.
   * Guarantees EXACTLY 1 page of bill and 0 blank pages!
   */
  printBill(reportData) {
    if (!reportData) {
      alert('Please calculate the bill before printing!');
      return;
    }

    // Create or reuse hidden iframe
    let iframe = document.getElementById('print-isolation-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-isolation-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rent Split Invoice Statement</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 8mm; }
          html, body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; background: #ffffff; color: #000000; }
          * { box-sizing: border-box; }
          .invoice-page { border: none !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
        </style>
      </head>
      <body>
        ${this.getInvoiceHTML(reportData)}
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
    }, 250);
  },

  /**
   * Export summary as a clean Text Statement (perfect for WhatsApp/Email)
   */
  exportToText(reportData) {
    if (!reportData || !reportData.allPersons || reportData.allPersons.length === 0) {
      alert('Please calculate the bill first!');
      return;
    }

    const currency = reportData.currency || '₹';
    const propName = reportData.propertyName || 'Rental Property / Booking';
    const samplePerson = reportData.allPersons[0] || {};
    const totalPaid = reportData.allPersons.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalBalance = reportData.allPersons.reduce((sum, p) => sum + (p.balance || 0), 0);

    let text = `=========================================\n`;
    text += `       RENT & UTILITY SPLIT STATEMENT     \n`;
    text += `=========================================\n`;
    text += `Property:         ${propName}\n`;
    text += `Billing Period:   ${samplePerson.startDate} to ${samplePerson.endDate} (${samplePerson.months || 1} months)\n`;
    text += `Generated:        ${new Date().toLocaleString()}\n`;
    text += `-----------------------------------------\n`;
    text += `Total Rent:       ${currency}${reportData.overallTotalRent.toLocaleString()}\n`;
    text += `Security Deposit: ${currency}${reportData.overallTotalDeposit.toLocaleString()}\n`;
    text += `Total Utilities:  ${currency}${reportData.overallTotalUtilities.toLocaleString()}\n`;
    text += `GRAND TOTAL DUE:  ${currency}${reportData.overallGrandTotal.toLocaleString()}\n`;
    text += `Total Paid:       ${currency}${totalPaid.toLocaleString()}\n`;
    text += `Remaining Due:    ${currency}${totalBalance.toLocaleString()}\n`;
    text += `=========================================\n\n`;

    reportData.allPersons.forEach((p, idx) => {
      text += `[${idx + 1}] ${p.name.toUpperCase()} (${p.roomName})\n`;
      text += `-----------------------------------------\n`;
      text += `Split Method:     ${p.splitMode === 'income' ? `Income Ratio (${p.incomePercentage})` : 'Equal Share'}\n`;
      if (p.splitMode === 'income' && p.income) {
        text += `Income / Salary:  ${currency}${p.income.toLocaleString()}\n`;
      }
      text += `• Room Rent:      ${currency}${p.rentShareTotal.toLocaleString()} (${currency}${p.rentShareMonthly}/mo)\n`;
      if (p.depositShare > 0) {
        text += `• Security Dep:   ${currency}${p.depositShare.toLocaleString()}\n`;
      }
      text += `• Electricity:    ${currency}${p.electricityShare.toLocaleString()}\n`;
      text += `• Water Bill:     ${currency}${p.waterShare.toLocaleString()}\n`;
      if (p.internetShare > 0) {
        text += `• Internet/WiFi:  ${currency}${p.internetShare.toLocaleString()}\n`;
      }
      if (p.otherServicesShare > 0) {
        text += `• Other Services: ${currency}${p.otherServicesShare.toLocaleString()}\n`;
      }
      text += `TOTAL DUE:        ${currency}${p.totalDue.toLocaleString()}\n`;
      text += `Amount Paid:      ${currency}${p.amountPaid.toLocaleString()} [${p.status.toUpperCase()}]\n`;
      text += `Balance Due:      ${currency}${p.balance.toLocaleString()}\n`;

      if (Array.isArray(p.payments) && p.payments.length > 0) {
        text += `Recorded Transactions:\n`;
        p.payments.forEach(tx => {
          text += `  - ${tx.date}: ${currency}${tx.amount} (${tx.method})\n`;
        });
      }
      text += `\n`;
    });

    text += `=========================================\n`;
    text += `      THANK YOU FOR USING RENTSPLIT       \n`;
    text += `=========================================\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const filename = `Rent_Bill_Summary_${new Date().toISOString().slice(0, 10)}.txt`;
    this._triggerDownload(blob, filename);
  },

  /**
   * Internal helper to download blob
   */
  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

window.Exporter = Exporter;
