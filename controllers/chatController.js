const { getAvailableMenu } = require("../services/menuService");
const { generateAIResponse } = require("../services/aiService");

const chatController = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                message: "Message is required"
            });
        }

        // Fetch available menu from MongoDB
        const menu = await getAvailableMenu();

        // Generate AI response using available menu
        const response = await generateAIResponse(message, menu);

        res.status(200).json({
            success: true,
            response
        });

    } catch (error) {
        console.error("Chat error:", error.message);

        res.status(500).json({
            success: false,
            message: "AI assistant is currently unavailable"
        });
    }
};

module.exports = { chatController };