const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true

    },
    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["customer", "staff", "admin"],
        default: "customer"
    }
}, { timestamps: true })

const users = mongoose.model("users", usersSchema)
module.exports = users