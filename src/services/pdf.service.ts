import PDFDocument from 'pdfkit';

export interface QuotationPdfData {
  quotationNumber?: string;
  clientName?: string;
  date?: string;
  expiryDate?: string;
  currency?: string;
  notesTop?: string;
  notesBottom?: string;
  companyName?: string;
  items?: Array<{
    materialName?: string;
    quantity?: number;
    unit?: string;
    price?: number;
  }>;
  discount?: number;
  discountType?: 'percent' | 'fixed';
  tax?: number;
}

export function generateQuotationPdfBuffer(data: QuotationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const currency = data.currency || 'EGP';
      const company = data.companyName || 'مؤسسة المنصة الرقمية للتجارة والخردة';

      // Header
      doc.fontSize(20).text(company, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text(`Quotation / Price Offer - #${data.quotationNumber || 'QT-2026'}`, { align: 'center' });
      doc.moveDown(1);

      // Meta Info
      doc.fontSize(11).text(`Client / Customer: ${data.clientName || 'Valued Client'}`);
      doc.text(`Date: ${data.date || new Date().toISOString().split('T')[0]}`);
      doc.text(`Expiry Date: ${data.expiryDate || ''}`);
      doc.moveDown(1);

      if (data.notesTop) {
        doc.fontSize(10).text(`Notes: ${data.notesTop}`);
        doc.moveDown(1);
      }

      // Items Table Header
      doc.fontSize(12).text('Items & Services:', { underline: true });
      doc.moveDown(0.5);

      let subtotal = 0;
      const items = data.items || [];

      items.forEach((item, index) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const total = qty * price;
        subtotal += total;

        doc.fontSize(10).text(
          `${index + 1}. ${item.materialName || 'Item'} | Qty: ${qty} ${item.unit || ''} | Price: ${price.toFixed(2)} ${currency} | Total: ${total.toFixed(2)} ${currency}`
        );
      });

      doc.moveDown(1);

      // Discount & Tax calculations
      let discountAmount = 0;
      if (data.discount) {
        if (data.discountType === 'percent') {
          discountAmount = (subtotal * data.discount) / 100;
        } else {
          discountAmount = data.discount;
        }
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const taxAmount = data.tax ? (afterDiscount * data.tax) / 100 : 0;
      const finalTotal = afterDiscount + taxAmount;

      doc.fontSize(11).text(`Subtotal: ${subtotal.toFixed(2)} ${currency}`);
      if (discountAmount > 0) {
        doc.text(`Discount: -${discountAmount.toFixed(2)} ${currency}`);
      }
      if (taxAmount > 0) {
        doc.text(`Tax (${data.tax || 14}%): +${taxAmount.toFixed(2)} ${currency}`);
      }
      doc.fontSize(13).text(`Grand Total: ${finalTotal.toFixed(2)} ${currency}`, { bold: true } as any);

      if (data.notesBottom) {
        doc.moveDown(1.5);
        doc.fontSize(10).text(`Terms & Conditions: ${data.notesBottom}`);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default { generateQuotationPdfBuffer };
