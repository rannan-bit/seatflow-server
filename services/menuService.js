const foods = require("../models/foodsModel");

const getAvailableMenu = async () => {
    const menu = await foods.find({ available: true })
        .select("name description price category isVeg")
        .lean();

    return menu;
};

module.exports = { getAvailableMenu };