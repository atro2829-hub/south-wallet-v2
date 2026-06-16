/**
 * Export Reports System for محفظة الجنوب
 * Generates CSV and printable HTML reports
 */

/**
 * Export data as CSV file (triggers download)
 */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data || data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Build CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that contain commas, quotes, or newlines
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Arabic support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a printable HTML page (opens in new window)
 */
export function exportToPDF(
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string; width?: string }[]
): void {
  if (!data || data.length === 0) return;

  const now = new Date().toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title} - محفظة الجنوب</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 30px; color: #1a1a1a; background: #fff; direction: rtl; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #5C1A1B; padding-bottom: 20px; }
    .header h1 { font-size: 22px; color: #1a1a1a; }
    .header .logo { font-size: 16px; color: #5C1A1B; font-weight: bold; }
    .header .date { font-size: 12px; color: #666; }
    .meta { display: flex; gap: 20px; margin-bottom: 20px; font-size: 13px; color: #555; }
    .meta span { background: #f5f5f5; padding: 4px 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #5C1A1B; color: #fff; padding: 10px 12px; text-align: right; font-weight: 600; white-space: nowrap; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #fff3f3; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
    .summary { display: flex; gap: 15px; margin-bottom: 20px; }
    .summary-card { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #eee; }
    .summary-card .label { font-size: 11px; color: #888; }
    .summary-card .value { font-size: 18px; font-weight: bold; color: #1a1a1a; }
    .status-pending { color: #F59E0B; font-weight: bold; }
    .status-completed { color: #10B981; font-weight: bold; }
    .status-cancelled { color: #5C1A1B; font-weight: bold; }
    .status-approved { color: #10B981; font-weight: bold; }
    .status-rejected { color: #5C1A1B; font-weight: bold; }
    @media print {
      body { padding: 15px; }
      .no-print { display: none !important; }
      table { font-size: 10px; }
      th, td { padding: 6px 8px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">محفظة الجنوب</div>
      <h1>${title}</h1>
    </div>
    <div style="text-align: left;">
      <div class="date">${now}</div>
      <button class="no-print" onclick="window.print()" style="margin-top:8px;padding:8px 20px;background:#5C1A1B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">طباعة / حفظ PDF</button>
    </div>
  </div>

  <div class="meta">
    <span>عدد السجلات: ${data.length}</span>
    <span>تاريخ التصدير: ${now}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        ${columns.map(col => `<th ${col.width ? `style="width:${col.width}"` : ''}>${col.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          ${columns.map(col => {
            const val = row[col.key];
            const statusClass = col.key === 'status' ? ` class="status-${val}"` : '';
            return `<td${statusClass}>${formatCellValue(val, col.key)}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    محفظة الجنوب - تقرير مُصدّر آلياً - ${now}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Fallback: use data URL
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    window.open(dataUrl, '_blank');
  }
  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Format a cell value for display in reports
 */
function formatCellValue(value: any, key: string): string {
  if (value === null || value === undefined) return '-';
  if (key === 'amount' || key === 'price' || key === 'balance') {
    return Number(value).toLocaleString('ar-SA');
  }
  if (key === 'createdAt' || key === 'completedAt' || key === 'reviewedAt') {
    try {
      return new Date(value).toLocaleString('ar-SA');
    } catch {
      return String(value);
    }
  }
  // Status labels in Arabic
  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    approved: 'مقبول',
    rejected: 'مرفوض',
    verified: 'موثق',
    submitted: 'مقدم',
  };
  if (key === 'status' && statusLabels[value]) {
    return statusLabels[value];
  }
  return String(value);
}

/**
 * Prepare orders report data for export
 */
export function prepareOrdersReport(orders: any[]): Record<string, any>[] {
  return orders.map(order => ({
    id: order.id,
    userName: order.userName,
    userPhone: order.userPhone || '-',
    providerName: order.providerName,
    packageName: order.packageName,
    customerInput: order.customerInput,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    executionType: order.executionType,
    createdAt: order.createdAt,
    completedAt: order.completedAt || '-',
  }));
}

/**
 * Prepare users report data for export
 */
export function prepareUsersReport(users: any[]): Record<string, any>[] {
  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    userId: user.userId,
    kycStatus: user.kycStatus,
    isBlocked: user.isBlocked ? 'محظور' : 'نشط',
    balanceYER: user.balanceYER || 0,
    balanceSAR: user.balanceSAR || 0,
    balanceUSD: user.balanceUSD || 0,
    governorate: user.governorate || '-',
    createdAt: user.createdAt || '-',
  }));
}

/**
 * Prepare financial report data for export
 */
export function prepareFinancialReport(
  orders: any[],
  deposits: any[],
  withdraws: any[]
): { transactions: Record<string, any>[]; summary: Record<string, any> } {
  const transactions: Record<string, any>[] = [];

  // Add orders
  orders.forEach(order => {
    transactions.push({
      id: order.id,
      type: 'طلب',
      userName: order.userName,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt,
    });
  });

  // Add deposits
  deposits.forEach(dep => {
    transactions.push({
      id: dep.id,
      type: 'إيداع',
      userName: dep.userName,
      amount: dep.amount,
      currency: dep.currency,
      status: dep.status,
      createdAt: dep.createdAt,
    });
  });

  // Add withdraws
  withdraws.forEach(w => {
    transactions.push({
      id: w.id,
      type: 'سحب',
      userName: w.userName,
      amount: w.amount,
      currency: w.currency,
      status: w.status,
      createdAt: w.createdAt,
    });
  });

  // Sort by date
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Summary
  const completedOrders = orders.filter(o => o.status === 'completed');
  const approvedDeposits = deposits.filter(d => d.status === 'approved');
  const approvedWithdraws = withdraws.filter(w => w.status === 'approved');

  const summary = {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    totalDeposits: approvedDeposits.length,
    totalWithdraws: approvedWithdraws.length,
    revenueYER: completedOrders.filter(o => o.currency === 'YER').reduce((s, o) => s + o.amount, 0),
    revenueSAR: completedOrders.filter(o => o.currency === 'SAR').reduce((s, o) => s + o.amount, 0),
    revenueUSD: completedOrders.filter(o => o.currency === 'USD').reduce((s, o) => s + o.amount, 0),
    depositsYER: approvedDeposits.filter(d => d.currency === 'YER').reduce((s, d) => s + d.amount, 0),
    withdrawsYER: approvedWithdraws.filter(w => w.currency === 'YER').reduce((s, w) => s + w.amount, 0),
  };

  return { transactions, summary };
}

/**
 * Prepare transaction report data for export
 */
export function prepareTransactionReport(transactions: any[]): Record<string, any>[] {
  return transactions.map(tx => ({
    id: tx.id,
    fromUserId: tx.fromUserId,
    toUserId: tx.toUserId,
    amount: tx.amount,
    currency: tx.currency,
    type: tx.type,
    status: tx.status,
    description: tx.description,
    createdAt: tx.createdAt,
  }));
}
