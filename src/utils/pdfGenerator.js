const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateInvoicePDF(data) {

  const {
    invoiceNumber,
    customerName,
    description,
    amount,
    currency
  } = data;

  const invoiceDir = path.join(__dirname, "../../invoices");

  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir);
  }

  const filePath = path.join(invoiceDir, `${invoiceNumber}.pdf`);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("INVOICE", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text(`Customer: ${customerName}`);
  doc.text(`Description: ${description}`);
  doc.moveDown();

  doc.text(`Amount: ${amount} ${currency}`, { bold: true });

  doc.end();

  return filePath;
}

module.exports = generateInvoicePDF;