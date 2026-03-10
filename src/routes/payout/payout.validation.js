const Joi = require("joi");

const requestPayout = Joi.object({
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().max(50).required()
});

const updateStatus = Joi.object({
  status: Joi.string()
    .valid("PENDING", "APPROVED", "REJECTED", "PAID")
    .required()
});

module.exports = {
  requestPayout,
  updateStatus
};