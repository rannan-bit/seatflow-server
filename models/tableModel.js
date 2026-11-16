const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({

    tableNumber: {
        type: Number,
        required: true,
        unique: true
    },

    capacity: {
        type: Number,
        required: true,
        min: 1
    },

    status: {
        type: String,
        enum: ["Available", "Occupied", "Reserved"],
        default: "Available"
    }

}, { timestamps: true });

const tables = mongoose.model("tables", tableSchema);

module.exports = tables;