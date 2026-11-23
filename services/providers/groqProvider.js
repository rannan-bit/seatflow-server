const Groq = require("groq-sdk");
const aiConfig = require("../../config/aiConfig");

const client = new Groq({
    apiKey: aiConfig.groq.apiKey
});

const generateResponse = async (message, menu) => {

    const menuContext = menu.map(food => `
        Name: ${food.name}
        Description: ${food.description}
        Price: ${food.price}
        Category: ${food.category}
        Vegetarian: ${food.isVeg ? "Yes" : "No"}
    `).join("\n");

    const response = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
            {
                role: "system",
                content: `
You are SeatFlow's AI Food Assistant.

Your job is to help customers discover and understand food items.

Rules:
- Recommend only food items from the provided menu.
- Do not invent food items.
- Explain food in simple and concise language.
- Use menu descriptions as the primary source of information.
- Do not invent ingredients or preparation details that are not provided.
- If the menu doesn't contain a suitable item, say so politely.
- Do not process orders or payments.

Available Menu:
${menuContext}
`
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
    name: "Groq",
    generateResponse
};