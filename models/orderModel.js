const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

    queue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "queues",
        required: true,
        index: true
    },

    items: [
        {
            food: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "foods",
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 1
            },

            price: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },

    tax: {
        type: Number,
        default: 0,
        min: 0
    },

    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    status: {
        type: String,
        enum: ["Pending", "Preparing", "Ready", "Served", "Cancelled"],
        default: "Pending"
    },

    paymentStatus: {
        type: String,
        enum: ["Unpaid", "Paid"],
        default: "Unpaid"
    }

}, { timestamps: true });


const orders = mongoose.model("orders", orderSchema);

module.exports = orders;