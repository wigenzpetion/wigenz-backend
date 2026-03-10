const Joi = require("joi");

const createPayment = Joi.object({
  order_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().max(10).optional(),
  payment_method: Joi.string().max(50).required(),
  transaction_id: Joi.string().max(255).optional()
});

const updateStatus = Joi.object({
  status: Joi.string()
    .valid("PENDING", "COMPLETED", "FAILED", "REFUNDED")
    .required()
});

module.exports = {
  createPayment,
  updateStatus
};