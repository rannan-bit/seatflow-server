require("dotenv").config();

const mongoose = require("mongoose");
const { getAvailableMenu } = require("./services/menuService");

async function testMenu() {
    try {

        await mongoose.connect(process.env.DBConnectionString);

        console.log("MongoDB connected");

        const menu = await getAvailableMenu();

        console.log("\nAvailable Menu:");

        console.log(menu);

    } catch (error) {

        console.error("Error:", error.message);

    } finally {

        await mongoose.disconnect();

    }
}

testMenu();