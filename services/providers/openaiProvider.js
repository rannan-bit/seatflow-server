const OpenAI = require("openai");
const aiConfig = require("../../config/aiConfig");

const client = new OpenAI({
    apiKey: aiConfig.openai.apiKey
});

const generateResponse = async (message) => {

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are SeatFlow's friendly food assistant. Help customers understand dishes and make food recommendations. Keep responses simple and concise."
            },
            {
                role: "user",
                content: message
            }
        ]
    });

    return response.choices[0].message.content;
};

module.exports = {
    name: "OpenAI",
    generateResponse
};