const InvoiceService = require("./invoice.service");

class InvoiceController {

  static async create(req, res, next) {
    try {
      const pdfPath = await InvoiceService.generateInvoice(req.body);
      res.status(201).json({ pdfPath });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InvoiceController;
