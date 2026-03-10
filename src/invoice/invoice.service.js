const db = require("../config/db");
const logger = require("../utils/log-system");

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

class InvoiceService {
  static async generateInvoice({
    userId,
    relatedId,
    type,
    description,
    amount,
    currency
  }) {
    const invoiceNumber = generateInvoiceNumber();
    let pdfPath = null;

    // Optional dependency path: keep invoice flow alive even if PDF toolchain is unavailable.
    try {
      const generateInvoicePDF = require("../utils/pdfGenerator");
      pdfPath = generateInvoicePDF({
        invoiceNumber,
        customerName: description,
        description,
        amount,
        currency
      });
    } catch (err) {
      logger.warn("Invoice PDF generation skipped", { error: err.message });
    }

    await db.query(
      `
      INSERT INTO invoices
      (user_id, related_id, type, amount, currency, pdf_path)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [userId, relatedId, type, amount, currency, pdfPath]
    );

    logger.info("Invoice auto-generated", { invoiceNumber, type });

    return pdfPath;
  }
}

module.exports = InvoiceService;