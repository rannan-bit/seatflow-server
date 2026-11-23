require("dotenv").config();

const { generateAIResponse } = require("./services/aiService");

const menu = [
    {
        name: "Chicken 65",
        description: "Spicy fried chicken pieces.",
        price: 180,
        category: "Starters",
        isVeg: false
    },
    {
        name: "Chicken Biriyani",
        description: "Chicken biriyani prepared with aromatic spices.",
        price: 220,
        category: "Mains",
        isVeg: false
    },
    {
        name: "Veg Fried Rice",
        description: "Fried rice prepared with fresh vegetables.",
        price: 150,
        category: "Mains",
        isVeg: true
    }
];

async function testAI() {
    try {

        const response = await generateAIResponse(
            "I want something spicy with chicken. What do you recommend?",
            menu
        );

        console.log("\nAI Response:");
        console.log(response);

    } catch (error) {

        console.error("\nAI Error:", error.message);

    }
}

testAI();