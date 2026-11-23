const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiConfig = require("../../config/aiConfig");

const genAI = new GoogleGenerativeAI(aiConfig.gemini.apiKey || "dummy");

const generateResponse = async (message, menu) => {
    // If key is missing or not a Google AI Studio key, fail fast so next provider takes over
    if (!aiConfig.gemini.apiKey || !aiConfig.gemini.apiKey.startsWith("AIza")) {
        throw new Error("Invalid or missing Google AI key");
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash"
    });

    const menuContext = Array.isArray(menu)
        ? menu.map(f => `${f.name} (${f.category}, ₹${f.price}) - ${f.description}`).join("\n")
        : "";

    const prompt = `You are SeatFlow's food assistant. Help customers choose from our restaurant menu:\n${menuContext}\n\nCustomer: ${message}`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
};

module.exports = {
    name: "Gemini",
    generateResponse
};
