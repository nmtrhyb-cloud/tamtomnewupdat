export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface StoreReceiptSettings {
  logoEnabled: boolean;
  storeName: string;
  phone: string;
  whatsapp: string;
  address: string;
  headerText: string;
  footerText: string;
  facebook: string;
  instagram: string;
  orderPrefix: string;
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
const TAMTOM_GREEN = '#3d9a2b';
const TAMTOM_ORANGE = '#f5a623';
const TAMTOM_LIGHT = '#fff9f7';
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

function generateInvoiceHTML(data: InvoiceData, settings?: StoreReceiptSettings): string {
  const logoEnabled = settings?.logoEnabled !== false;
  const storeName = settings?.storeName || 'طمطوم للتوصيل';
  const phone = settings?.phone || '';
  const whatsapp = settings?.whatsapp || '';
  const address = settings?.address || '';
  const headerText = settings?.headerText || 'شكراً لتسوقكم معنا';
  const footerText = settings?.footerText || 'لا تُقبل هذه الفاتورة إذا لم تكن مطابقة لنظام طمطوم وما لم يكن عليها ختم الشركة واسم وتوقيع الكابتن.';
  const facebook = settings?.facebook || '';
  const instagram = settings?.instagram || '';

  const logoURL = `${window.location.origin}/tamtom-logo.png`;

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:right;font-size:13px;">${item.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${item.price.toLocaleString('ar-YE')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${item.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${TAMTOM_BORDER};text-align:center;font-size:13px;border-right:1px solid ${TAMTOM_BORDER};">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  const emptyRows = Array.from({ length: Math.max(0, 5 - data.items.length) }, () => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
      <td style="padding:10px;border-bottom:1px solid ${TAMTOM_BORDER};border-right:1px solid ${TAMTOM_BORDER};">&nbsp;</td>
    </tr>
  `).join('');

  const contactLines: string[] = [];
  if (phone) contactLines.push(`📞 ${phone}`);
  if (whatsapp) contactLines.push(`💬 واتساب: ${whatsapp}`);
  if (address) contactLines.push(`📍 ${address}`);
  if (facebook) contactLines.push(`fb: ${facebook}`);
  if (instagram) contactLines.push(`ig: ${instagram}`);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة طلب #${data.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f0f0f0; direction: rtl; }
    .page { background: white; width: 80mm; max-width: 420px; margin: 20px auto; border-radius: 14px; overflow: hidden; border: 2px solid ${TAMTOM_BORDER}; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    @media print {
      body { background: white; }
      .page { margin: 0; border: none; border-radius: 0; width: 100%; max-width: 100%; box-shadow: none; }
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
    <div style="background:linear-gradient(135deg,${TAMTOM_RED} 0%,#c82a08 100%);padding:0;overflow:hidden;">
      <!-- شريط أخضر علوي -->
      <div style="background:${TAMTOM_GREEN};height:5px;"></div>
      
      <!-- محتوى الترويسة -->
      <div style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
        <!-- معلومات الطلب -->
        <div style="text-align:right;">
          <div style="color:rgba(255,255,255,0.8);font-size:10px;margin-bottom:2px;">التاريخ</div>
          <div style="color:white;font-size:11px;font-weight:bold;">${formatDate(data.date)}</div>
          ${data.type === 'wasalni' ? `<div style="margin-top:6px;background:${TAMTOM_ORANGE};color:white;font-size:10px;padding:2px 8px;border-radius:10px;display:inline-block;">وصلني</div>` : ''}
        </div>

        <!-- الشعار -->
        <div style="text-align:center;flex:1;">
          <div style="background:white;border-radius:10px;padding:6px 12px;display:inline-block;text-align:center;">
            ${logoEnabled ? `
              <img src="${logoURL}" 
                   style="height:44px;width:auto;object-fit:contain;display:block;margin:0 auto 2px;"
                   onerror="this.style.display='none'" />
            ` : ''}
            <div style="color:${TAMTOM_RED};font-size:20px;font-weight:900;letter-spacing:-1px;line-height:1;">طمطوم</div>
            <div style="color:${TAMTOM_GREEN};font-size:9px;text-align:center;letter-spacing:2px;">TAM TOM</div>
          </div>
          ${headerText ? `<div style="color:rgba(255,255,255,0.9);font-size:10px;margin-top:4px;">${headerText}</div>` : ''}
        </div>

        <!-- اسم المتجر -->
        <div style="text-align:left;min-width:60px;">
          <div style="color:rgba(255,255,255,0.8);font-size:10px;margin-bottom:2px;">المتجر</div>
          <div style="color:white;font-size:10px;font-weight:bold;">${storeName}</div>
        </div>
      </div>

      <!-- معلومات التواصل -->
      ${contactLines.length > 0 ? `
      <div style="background:rgba(0,0,0,0.15);padding:6px 16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${contactLines.map(c => `<span style="color:rgba(255,255,255,0.9);font-size:10px;">${c}</span>`).join('')}
      </div>
      ` : ''}

      <!-- شريط برتقالي سفلي -->
      <div style="background:${TAMTOM_ORANGE};height:4px;"></div>
    </div>

    <!-- معلومات الفاتورة -->
    <div style="padding:8px 14px;display:flex;justify-content:space-between;background:${TAMTOM_LIGHT};border-bottom:2px solid ${TAMTOM_BORDER};">
      <div style="font-size:12px;color:#333;">
        <strong style="color:${TAMTOM_RED};">رقم الفاتورة:</strong>
        <span style="font-weight:bold;"> ${data.invoiceNumber || data.orderNumber}</span>
      </div>
      <div style="font-size:12px;color:#333;">
        <strong style="color:${TAMTOM_GREEN};">رقم الطلب:</strong>
        <span style="font-weight:bold;"> ${data.orderNumber}</span>
      </div>
    </div>

    <!-- بيانات العميل -->
    ${data.customerName || data.customerPhone || data.customerAddress ? `
    <div style="padding:8px 14px;background:#fff;border-bottom:1px solid ${TAMTOM_BORDER};">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${data.customerName ? `<div style="font-size:11px;color:#555;"><strong style="color:${TAMTOM_RED};">العميل:</strong> ${data.customerName}</div>` : ''}
        ${data.customerPhone ? `<div style="font-size:11px;color:#555;"><strong style="color:${TAMTOM_RED};">الهاتف:</strong> ${data.customerPhone}</div>` : ''}
      </div>
      ${data.customerAddress ? `<div style="font-size:11px;color:#555;margin-top:3px;"><strong style="color:${TAMTOM_RED};">العنوان:</strong> ${data.customerAddress}</div>` : ''}
    </div>
    ` : ''}

    <!-- جدول المنتجات -->
    <table>
      <thead>
        <tr>
          <th style="background:${TAMTOM_RED};color:white;padding:9px 10px;text-align:right;font-size:12px;font-weight:bold;">تفاصيل الطلب</th>
          <th style="background:${TAMTOM_RED};color:white;padding:9px;text-align:center;font-size:12px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:65px;">السعر</th>
          <th style="background:${TAMTOM_RED};color:white;padding:9px;text-align:center;font-size:12px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:40px;">الكمية</th>
          <th style="background:${TAMTOM_RED};color:white;padding:9px;text-align:center;font-size:12px;font-weight:bold;border-right:1px solid rgba(255,255,255,0.3);width:75px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <!-- الإجمالي -->
    <div style="border-top:3px solid ${TAMTOM_RED};">
      <table>
        <tr>
          <td style="width:50%;padding:10px 12px;border-left:2px solid ${TAMTOM_BORDER};">
            <div style="background:${TAMTOM_GREEN};color:white;text-align:center;padding:7px;font-weight:bold;font-size:12px;border-radius:6px;">إجمالي الفاتورة</div>
            <div style="text-align:center;padding:8px 4px;font-size:16px;font-weight:bold;color:${TAMTOM_RED};">${formatCurrency(data.total)}</div>
          </td>
          <td style="width:50%;padding:10px 12px;">
            <div style="background:${TAMTOM_ORANGE};color:white;text-align:center;padding:7px;font-weight:bold;font-size:12px;border-radius:6px;">تفصيل الطلب</div>
            <div style="text-align:center;padding:4px;font-size:13px;font-weight:bold;color:#333;">${formatCurrency(data.subtotal)}</div>
            ${data.deliveryFee ? `<div style="font-size:10px;color:#666;text-align:center;">+ توصيل: ${formatCurrency(data.deliveryFee)}</div>` : ''}
            ${data.discount ? `<div style="font-size:10px;color:${TAMTOM_GREEN};text-align:center;">- خصم: ${formatCurrency(data.discount)}</div>` : ''}
          </td>
        </tr>
      </table>
    </div>

    <!-- السائق والتوقيع -->
    <div style="padding:10px 14px;border-top:1px solid ${TAMTOM_BORDER};background:${TAMTOM_LIGHT};display:flex;justify-content:space-between;gap:14px;">
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:bold;color:${TAMTOM_GREEN};margin-bottom:3px;">كابتن التوصيل:</div>
        <div style="font-size:12px;color:#444;border-bottom:1px dashed #bbb;padding-bottom:4px;">${data.driverName || '............................'}</div>
        ${data.driverPhone ? `<div style="font-size:10px;color:#888;margin-top:2px;">${data.driverPhone}</div>` : ''}
      </div>
      <div style="flex:1;text-align:left;">
        <div style="font-size:11px;font-weight:bold;color:${TAMTOM_GREEN};margin-bottom:3px;">توقيع الكابتن:</div>
        <div style="font-size:12px;color:#ccc;border-bottom:1px dashed #bbb;padding-bottom:4px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
    </div>

    <!-- طريقة الدفع والملاحظات -->
    ${data.paymentMethod || data.notes ? `
    <div style="padding:6px 14px;border-top:1px solid ${TAMTOM_BORDER};display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
      ${data.paymentMethod ? `<div style="font-size:11px;color:#555;"><strong style="color:${TAMTOM_RED};">الدفع:</strong> ${data.paymentMethod}</div>` : ''}
      ${data.notes ? `<div style="font-size:11px;color:#777;"><strong>ملاحظات:</strong> ${data.notes}</div>` : ''}
    </div>
    ` : ''}

    <!-- التذييل -->
    <div style="background:linear-gradient(135deg,${TAMTOM_RED} 0%,#c82a08 100%);padding:0;">
      <div style="background:${TAMTOM_ORANGE};height:3px;"></div>
      <div style="padding:10px 14px;text-align:center;">
        <p style="font-size:10px;color:rgba(255,255,255,0.85);line-height:1.6;">
          ${footerText}
        </p>
      </div>
      <div style="background:${TAMTOM_GREEN};height:4px;"></div>
    </div>
  </div>
</body>
</html>`;
}

export async function fetchReceiptSettings(): Promise<StoreReceiptSettings> {
  try {
    const res = await fetch('/api/ui-settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data: Array<{ key: string; value: string }> = await res.json();
    const map = new Map(data.map(s => [s.key, s.value]));

    return {
      logoEnabled: map.get('receipt_logo_enabled') !== 'false',
      storeName: map.get('receipt_store_name') || 'طمطوم للتوصيل',
      phone: map.get('receipt_phone') || '',
      whatsapp: map.get('receipt_whatsapp') || '',
      address: map.get('receipt_address') || '',
      headerText: map.get('receipt_header_text') || 'شكراً لتسوقكم معنا',
      footerText: map.get('receipt_footer_text') || 'لا تُقبل هذه الفاتورة إذا لم تكن مطابقة لنظام طمطوم.',
      facebook: map.get('receipt_facebook') || '',
      instagram: map.get('receipt_instagram') || '',
      orderPrefix: map.get('order_number_prefix') || 'TT',
    };
  } catch {
    return {
      logoEnabled: true,
      storeName: 'طمطوم للتوصيل',
      phone: '',
      whatsapp: '',
      address: '',
      headerText: 'شكراً لتسوقكم معنا',
      footerText: 'لا تُقبل هذه الفاتورة إذا لم تكن مطابقة لنظام طمطوم.',
      facebook: '',
      instagram: '',
      orderPrefix: 'TT',
    };
  }
}

function openInvoiceWindow(html: string): void {
  const win = window.open('', '_blank', 'width=520,height=780,scrollbars=yes');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    return;
  }
  win.document.write(html);
  win.document.close();
}

export async function printOrderInvoice(data: InvoiceData): Promise<void> {
  const settings = await fetchReceiptSettings();
  const html = generateInvoiceHTML(data, settings);
  openInvoiceWindow(html);
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
    storeName: order.storeName || '',
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
