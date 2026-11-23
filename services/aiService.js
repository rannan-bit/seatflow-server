const groqProvider = require("./providers/groqProvider");
const geminiProvider = require("./providers/geminiProvider");
const openaiProvider = require("./providers/openaiProvider");

// Groq is fast, active, and menu-aware, so prioritize it first
const providers = [
    groqProvider,
    geminiProvider,
    openaiProvider
];

function generateRuleBasedFallback(message, menu) {
    const text = (message || "").toLowerCase();
    const available = Array.isArray(menu) && menu.length > 0 ? menu : [];

    if (text.includes("veg") && !text.includes("non-veg") && !text.includes("non veg")) {
        const vegItems = available.filter(item => item.isVeg !== false);
        if (vegItems.length > 0) {
            return `Here are our delicious vegetarian options:\n\n` +
                vegItems.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n") +
                `\n\nWould you like recommendations for any specific category?`;
        }
    }

    if (text.includes("non-veg") || text.includes("non veg") || text.includes("chicken") || text.includes("meat")) {
        const nonVegItems = available.filter(item => item.isVeg === false);
        if (nonVegItems.length > 0) {
            return `Here are our non-vegetarian selections:\n\n` +
                nonVegItems.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n") +
                `\n\nLet me know if you would like pairing suggestions!`;
        }
    }

    if (text.includes("starter") || text.includes("appetizer") || text.includes("snack")) {
        const starters = available.filter(item => item.category === "Starters");
        if (starters.length > 0) {
            return `Our popular starters:\n\n` +
                starters.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n");
        }
    }

    if (text.includes("drink") || text.includes("beverage") || text.includes("dessert") || text.includes("sweet")) {
        const drinks = available.filter(item => item.category === "Drinks");
        if (drinks.length > 0) {
            return `Here are our drinks and desserts:\n\n` +
                drinks.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n");
        }
    }

    if (text.includes("popular") || text.includes("favourite") || text.includes("recommend") || text.includes("best") || text.includes("special")) {
        const popular = available.filter(item => item.category === "Popular");
        const picks = popular.length > 0 ? popular : available.slice(0, 3);
        return `Here are our house favourites at The Olive Room:\n\n` +
            picks.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n") +
            `\n\nWould you like vegetarian or non-vegetarian options?`;
    }

    if (available.length > 0) {
        const topPicks = available.slice(0, 4);
        return `Welcome to The Olive Room! Here are some of our featured dishes today:\n\n` +
            topPicks.map(item => `• **${item.name}** (₹${item.price}) — ${item.description}`).join("\n") +
            `\n\nAsk me about vegetarian options, starters, or specific cravings!`;
    }

    return "Welcome to The Olive Room! Please explore our menu section to view all available dishes.";
}

const generateAIResponse = async (message, menu) => {
    for (const provider of providers) {
        try {
            console.log(`Trying ${provider.name}...`);

            const response = await Promise.race([
                provider.generateResponse(message, menu),
                new Promise((_, reject) =>
                    setTimeout(() => {
                        reject(new Error("Provider timeout"));
                    }, 4000)
                )
            ]);

            console.log(`${provider.name} succeeded`);
            return response;

        } catch (error) {
            console.error(`${provider.name} failed:`, error.message);
        }
    }

    console.log("Using menu-grounded fallback response");
    return generateRuleBasedFallback(message, menu);
};

module.exports = { generateAIResponse };
