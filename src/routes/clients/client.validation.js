const Joi = require("joi");

/**
 * UUID Validation
 */
const uuidParam = Joi.object({
  id: Joi.string()
    .uuid({ version: "uuidv4" })
    .required()
});

/**
 * Create Client Validation
 */
const createClient = Joi.object({
  user_id: Joi.string()
    .uuid({ version: "uuidv4" })
    .required(),

  first_name: Joi.string()
    .min(2)
    .max(100)
    .required(),

  last_name: Joi.string()
    .min(2)
    .max(100)
    .required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]+$/)
    .min(8)
    .max(20)
    .required(),

  address: Joi.string()
    .min(5)
    .max(255)
    .required(),

  city: Joi.string()
    .min(2)
    .max(100)
    .required()
});

/**
 * Update Client Validation
 * (All fields optional)
 */
const updateClient = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  last_name: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]+$/)
    .min(8)
    .max(20)
    .optional(),

  address: Joi.string()
    .min(5)
    .max(255)
    .optional(),

  city: Joi.string()
    .min(2)
    .max(100)
    .optional()
}).min(1); // At least one field required

/**
 * Pagination Validation (Admin)
 */
const pagination = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50),

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
});

module.exports = {
  uuidParam,
  createClient,
  updateClient,
  pagination
};