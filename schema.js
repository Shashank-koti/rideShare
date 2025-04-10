const Joi = require('joi');

module.exports.ridePostSchema = Joi.object({
    ride: Joi.object({
        pickUp: Joi.string().required(),
        drop: Joi.string().required(),
        date: Joi.date().iso().required(),  // Ensures valid date format (YYYY-MM-DD)
        price: Joi.number().required().min(0),  // Price must be a positive number
        seats: Joi.number().integer().required().min(1), // Seats must be a number (min 1)
        aadhaar: Joi.string()
        .pattern(/^\d{12}$/, 'Aadhaar')  // Ensures it's exactly 12 digits
        .message('Aadhaar number must be exactly 12 digits')
        .required(),
        vehicle: Joi.string().required()
    }).required()
});
