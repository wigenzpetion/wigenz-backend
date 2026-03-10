const PaymentService = require("../payment/payment.service");

if (typeof PaymentService.processMidnightPayouts === "function") {
  PaymentService.processMidnightPayouts();
} else if (typeof PaymentService.processDriverPayouts === "function") {
  PaymentService.processDriverPayouts();
}
