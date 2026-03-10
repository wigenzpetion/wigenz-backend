const Joi = require("joi");

const uuidParam = Joi.object({
  id: Joi.string().uuid().required()
});

const createDriver = Joi.object({
  user_id: Joi.string().uuid().required(),
  vehicle_type: Joi.string().min(2).max(100).required(),
  vehicle_plate: Joi.string().min(3).max(20).required(),
  license_number: Joi.string().min(5).max(50).required(),
  status: Joi.string().valid("PENDING","ACTIVE","SUSPENDED")
});

const updateDriver = Joi.object({
  vehicle_type: Joi.string().min(2).max(100),
  vehicle_plate: Joi.string().min(3).max(20),
  license_number: Joi.string().min(5).max(50),
  status: Joi.string().valid("PENDING","ACTIVE","SUSPENDED")
}).min(1);

module.exports = {
  uuidParam,
  createDriver,
  updateDriver
};