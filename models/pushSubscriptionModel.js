const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema({

    queue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "queues",
        required: true
    },

    endpoint: {
        type: String,
        required: true,
        unique: true
    },

    expirationTime: {
        type: Number,
        default: null
    },

    keys: {
        p256dh: {
            type: String,
            required: true
        },
        auth: {
            type: String,
            required: true
        }
    }

}, { timestamps: true });

module.exports = mongoose.model(
    "pushSubscriptions",
    pushSubscriptionSchema
);