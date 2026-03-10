const nodemailer = require("nodemailer");
const fs = require("fs");

function createAlertTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function createInvoiceTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return createAlertTransporter();
}

class EmailService {
  static async send(to, subject, message) {
    return this.sendAlert(to, subject, message);
  }

  static async sendAlert(to, subject, message) {
    const transporter = createAlertTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER || process.env.SMTP_USER,
      to,
      subject,
      text: message
    });
  }

  static async sendInvoice({ to, subject, text, pdfPath }) {
    const transporter = createInvoiceTransporter();
    const mailOptions = {
      from: `"Livrai" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    };

    if (pdfPath) {
      mailOptions.attachments = [
        {
          filename: "invoice.pdf",
          content: fs.createReadStream(pdfPath)
        }
      ];
    }

    await transporter.sendMail(mailOptions);
  }
}

module.exports = EmailService;
