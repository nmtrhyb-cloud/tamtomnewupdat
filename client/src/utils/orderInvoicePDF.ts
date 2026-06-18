export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceData {
  orderNumber: string;
  invoiceNumber?: string;
  date: string;
  storeName?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  driverName?: string;
  driverPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  type?: 'order' | 'wasalni';
}

const TAMTOM_RED = '#ec3714';
const TAMTOM_LIGHT = '#fff5f3';
const TAMTOM_BORDER = '#fcd5cc';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.ي`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function generateInvoiceHTML(data: InvoiceData): string {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:right;font-size:13px;">${item.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${item.price.toLocaleString('ar-YE')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${item.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  const emptyRows = Array.from({ length: Math.max(0, 6 - data.items.length) }, () => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة طلب #${data.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; direction: rtl; }
    .page { background: white; width: 80mm; max-width: 420px; margin: 20px auto; border-radius: 12px; overflow: hidden; border: 2px solid ${TAMTOM_BORDER}; }
    @media print {
      body { background: white; }
      .page { margin: 0; border: none; border-radius: 0; width: 100%; max-width: 100%; }
      .no-print { display: none !important; }
    }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:16px;background:#f9f9f9;">
    <button onclick="window.print()" style="background:${TAMTOM_RED};color:white;border:none;padding:10px 30px;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit;">
      🖨️ طباعة الفاتورة
    </button>
    <button onclick="window.close()" style="background:#666;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:15px;cursor:pointer;margin-right:10px;font-family:inherit;">
      ✕ إغلاق
    </button>
  </div>

  <div class="page">
    <!-- الترويسة -->
    <div style="background:${TAMTOM_RED};padding:18px 20px;display:flex;justify-content:space-between;align-items:center;">
      <div style="text-align:right;">
        <div style="color:white;font-size:11px;opacity:0.85;">التاريخ: ............................</div>
        <div style="color:white;font-size:11px;opacity:0.85;margin-top:4px;">اسم المحل: ..........................</div>
      </div>
      <div style="text-align:center;">
        <div style="background:white;border-radius:10px;padding:6px 14px;display:inline-block;">
          <span style="color:${TAMTOM_RED};font-size:26px;font-weight:900;letter-spacing:-1px;">طمطوم</span>
        </div>
        <div style="color:white;font-size:10px;margin-top:4px;opacity:0.9;">منصة طمطوم للتوصيل</div>
      </div>
    </div>

    <!-- معلومات الفاتورة -->
    <div style="padding:10px 16px;display:flex;justify-content:space-between;background:${TAMTOM_LIGHT};border-bottom:1px solid ${TAMTOM_BORDER};">
      <div style="font-size:12px;color:#333;">
        <strong style="color:${TAMTOM_RED};">رقم الفاتورة:</strong>
        <span style="font-weight:bold;">${data.invoiceNumber || data.orderNumber}</span>
      </div>
      <div style="font-size:12px;color:#333;">
        <strong style="color:${TAMTOM_RED};">رقم الطلب:</strong>
        <span style="font-weight:bold;">${data.orderNumber}</span>
      </div>
    </div>

    ${data.storeName || data.customerName ? `
    <div style="padding:8px 16px;background:#fff;border-bottom:1px solid ${TAMTOM_BORDER};font-size:12px;color:#555;">
      ${data.storeName ? `<span><strong>المتجر:</strong> ${data.storeName}</span>` : ''}
      ${data.customerName ? `<span style="margin-right:16px;"><strong>العميل:</strong> ${data.customerName}</span>` : ''}
    </div>
    ` : ''}

    <!-- جدول المنتجات -->
    <table>
      <thead>
        <tr>
          <th style="background:${TAMTOM_RED};color:white;padding:10px;text-align:right;font-size:13px;font-weight:bold;">تفاصيل الطلبات</th>
          <th style="background:${TAMTOM_RED};color:white;padding:10px;text-align:center;font-size:13px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:70px;">السعر</th>
          <th style="background:${TAMTOM_RED};color:white;padding:10px;text-align:center;font-size:13px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:45px;">العدد</th>
          <th style="background:${TAMTOM_RED};color:white;padding:10px;text-align:center;font-size:13px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:80px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <!-- الإجمالي -->
    <table style="border-top:2px solid ${TAMTOM_RED};">
      <tr>
        <td style="width:50%;padding:10px 14px;">
          <div style="background:${TAMTOM_RED};color:white;text-align:center;padding:8px;font-weight:bold;font-size:13px;border-radius:4px;">إجمالي الفاتورة</div>
          <div style="text-align:center;padding:10px;font-size:15px;font-weight:bold;color:#333;">${formatCurrency(data.total)}</div>
        </td>
        <td style="width:50%;padding:10px 14px;border-right:2px solid ${TAMTOM_BORDER};">
          <div style="background:${TAMTOM_RED};color:white;text-align:center;padding:8px;font-weight:bold;font-size:13px;border-radius:4px;">إجمالي الطلب</div>
          <div style="text-align:center;padding:10px;font-size:15px;font-weight:bold;color:#333;">
            ${formatCurrency(data.subtotal)}
            ${data.deliveryFee ? `<div style="font-size:11px;color:#888;font-weight:normal;">+ توصيل: ${formatCurrency(data.deliveryFee)}</div>` : ''}
            ${data.discount ? `<div style="font-size:11px;color:green;font-weight:normal;">- خصم: ${formatCurrency(data.discount)}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- السائق والتوقيع -->
    <div style="padding:12px 16px;border-top:1px solid ${TAMTOM_BORDER};display:flex;justify-content:space-between;gap:16px;">
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:bold;color:${TAMTOM_RED};margin-bottom:4px;">كابتن التوصيل:</div>
        <div style="font-size:12px;color:#555;border-bottom:1px dashed #ccc;padding-bottom:4px;">${data.driverName || '............................'}</div>
      </div>
      <div style="flex:1;text-align:left;">
        <div style="font-size:12px;font-weight:bold;color:${TAMTOM_RED};margin-bottom:4px;">توقيع الكابتن:</div>
        <div style="font-size:12px;color:#aaa;border-bottom:1px dashed #ccc;padding-bottom:4px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
    </div>

    <!-- ملاحظة -->
    <div style="background:${TAMTOM_LIGHT};border-top:1px solid ${TAMTOM_BORDER};padding:8px 14px;">
      <p style="font-size:10px;color:#666;text-align:center;line-height:1.5;">
        لا تُقبل هذه الفاتورة إذا لم تكن مطابقة لنظام طمطوم وما لم يكن عليها ختم الشركة واسم وتوقيع الكابتن.
      </p>
      ${data.paymentMethod ? `<p style="font-size:11px;text-align:center;margin-top:4px;"><strong>طريقة الدفع:</strong> ${data.paymentMethod}</p>` : ''}
      ${data.notes ? `<p style="font-size:11px;text-align:center;margin-top:4px;color:#888;"><strong>ملاحظات:</strong> ${data.notes}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

export function printOrderInvoice(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  const win = window.open('', '_blank', 'width=520,height=750,scrollbars=yes');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    return;
  }
  win.document.write(html);
  win.document.close();
}

export function buildOrderInvoiceData(order: any): InvoiceData {
  const items: InvoiceItem[] = [];

  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      items.push({
        name: item.name || item.menuItem?.name || 'منتج',
        quantity: item.quantity || 1,
        price: parseFloat(item.price || item.unitPrice || 0),
        total: parseFloat(item.total || item.subtotal || (item.price * (item.quantity || 1)) || 0),
      });
    });
  }

  const subtotal = parseFloat(order.subtotal || order.total || 0);
  const deliveryFee = parseFloat(order.deliveryFee || order.delivery_fee || 0);
  const discount = parseFloat(order.discountAmount || order.discount || 0);
  const total = parseFloat(order.totalAmount || order.total || 0);

  return {
    orderNumber: order.orderNumber || order.id?.slice(0, 8)?.toUpperCase() || '—',
    invoiceNumber: `INV-${order.orderNumber || order.id?.slice(0, 8)?.toUpperCase()}`,
    date: order.createdAt || new Date().toISOString(),
    storeName: order.restaurantName || order.storeName || '',
    customerName: order.customerName || order.userName || '',
    customerPhone: order.customerPhone || '',
    customerAddress: order.deliveryAddress || order.address || '',
    driverName: order.driverName || '',
    driverPhone: order.driverPhone || '',
    items,
    subtotal,
    deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
    discount: discount > 0 ? discount : undefined,
    total,
    paymentMethod: order.paymentMethod || order.payment_method || '',
    notes: order.notes || '',
    type: 'order',
  };
}
