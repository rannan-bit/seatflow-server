const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({

    customerName: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true
    },

    guests: {
        type: Number,
        required: true,
        min: 1
    },

    token: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: ["Waiting", "Assigned", "Seated", "Completed", "Cancelled"],
        default: "Waiting"
    },

    assignedTable: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "tables",
        default: null
    },

    joinedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

const queues = mongoose.model("queues", queueSchema);

module.exports = queues;