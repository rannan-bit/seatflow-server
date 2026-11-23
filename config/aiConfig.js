require("dotenv").config();

module.exports = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY
    },

    gemini: {
        apiKey: process.env.GEMINI_API_KEY
    },

    groq: {
        apiKey: process.env.GROQ_API_KEY
    }
};