const { number } = require("joi");
const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
    pickUp: {
        type: String,
        required: true,
        trim: true
    },
    drop: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seats: {
        type: Number,
        required: true,
        min: -1
    },
    aadhaar: {
        type: String,  // Store Aadhaar as a string to preserve leading zeros
        required: true,
        trim: true,
        validate: {
            validator: function(value) {
                // Validate Aadhaar number to ensure it is exactly 12 digits
                return /^\d{12}$/.test(value);
            },
            // message: 'Aadhaar number must be exactly 12 digits.'
        },
        set: function(value) {
            // Ensure that we store it as a string (even if entered as a number)
            return value.toString();
        }
    },
    vehicle: {
        type: String,
        required: true
    },
    bookedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]
});

// Corrected model name to "RideListing" instead of "Post"
module.exports = mongoose.model("RideListing", rideSchema);
