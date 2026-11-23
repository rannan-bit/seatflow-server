const foods = require('../models/foodsModel');

// ADMIN - ADD FOOD

exports.addFoodController = async (req, res) => {

    console.log("Inside add food controller");

    try {

        const { name, description, price, category, available, isVeg } = req.body;

        // Step 1: Validate fields
        if (!name || !description || price === undefined || price === "" || !category) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const parsedPrice = Number(price);

        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                message: "Valid price is required"
            });
        }

        const allowedCategories = ["Popular", "Starters", "Mains", "Drinks"];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }

        // Step 2: Get image path
        const image = req.file ? req.file.filename : "";

        // Step 3: Create food
        const newFood = await foods.create({
            name,
            description,
            price: parsedPrice,
            category,
            image,
            // New dishes are available unless the admin explicitly says otherwise
            available: available === undefined ? true : available === true || available === "true",
            isVeg: isVeg === undefined ? true : (isVeg === true || isVeg === "true")
        });

        // Step 4: Send response
        return res.status(201).json({
            message: "Food added successfully",
            food: newFood
        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Food addition failed"
        });

    }

};
// GET ALL FOODS
exports.getAllFoodsController = async (req, res) => {
    console.log("inside getAllFoodsController");

    try {
        const searchKey = req.query.search;
        const query = searchKey
            ? {
                $or: [
                    { name: { $regex: searchKey, $options: "i" } },
                    { description: { $regex: searchKey, $options: "i" } }
                ]
            }
            : {};

        const allFoods = await foods.find(query);
        return res.status(200).json(allFoods);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch foods",
            error: error.message
        });
    }
};

// GET SINGLE FOOD
exports.getSingleFoodController = async (req, res) => {
    console.log("inside getSingleFoodController");

    const { id } = req.params;

    try {
        const food = await foods.findById(id);

        if (!food) {
            return res.status(404).json({
                message: "Food item not found"
            });
        }

        return res.status(200).json(food);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch food item",
            error: error.message
        });
    }
};

// UPDATE FOOD
exports.updateFoodController = async (req, res) => {
    console.log("inside updateFoodController");

    const { id } = req.params;
    const { name, description, price, category, available, image, isVeg } = req.body;

    // Use newly uploaded image filename if available, otherwise retain existing image
    const updateImage = req.file ? req.file.filename : image;

    try {
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) {
            if (Number.isNaN(Number(price)) || Number(price) < 0) {
                return res.status(400).json({
                    message: "Valid price is required"
                });
            }
            updateData.price = Number(price);
        }
        if (category !== undefined) {
            const allowedCategories = ["Popular", "Starters", "Mains", "Drinks"];

            if (!allowedCategories.includes(category)) {
                return res.status(400).json({
                    message: "Invalid category"
                });
            }

            updateData.category = category;
        }
        if (updateImage !== undefined) updateData.image = updateImage;
        if (available !== undefined) {
            updateData.available = available === true || available === "true";
        }
        if (isVeg !== undefined) {
            updateData.isVeg = isVeg === true || isVeg === "true";
        }

        const updatedFood = await foods.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: "after", runValidators: true }
        );

        if (!updatedFood) {
            return res.status(404).json({
                message: "Food item not found"
            });
        }

        return res.status(200).json({
            message: "Food updated successfully",
            food: updatedFood
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update food item",
            error: error.message
        });
    }
};

// DELETE FOOD
exports.deleteFoodController = async (req, res) => {
    console.log("inside deleteFoodController");

    const { id } = req.params;

    try {
        const deletedFood = await foods.findByIdAndDelete(id);

        if (!deletedFood) {
            return res.status(404).json({
                message: "Food item not found"
            });
        }

        return res.status(200).json({
            message: "Food deleted successfully",
            food: deletedFood
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to delete food item",
            error: error.message
        });
    }
};

// CHANGE AVAILABILITY
exports.changeAvailabilityController = async (req, res) => {
    console.log("inside changeAvailabilityController");

    const { id } = req.params;
    const { available } = req.body;

    try {
        const food = await foods.findById(id);

        if (!food) {
            return res.status(404).json({
                message: "Food item not found"
            });
        }

        // If 'available' is passed in body use it; otherwise toggle current boolean
        // Accepts JSON booleans and multipart/form-data strings ("true" / "false")
        const newAvailability = available !== undefined
            ? available === true || available === "true"
            : !food.available;
        food.available = newAvailability;
        await food.save();

        return res.status(200).json({
            message: `Food availability updated to ${newAvailability}`,
            food
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to change food availability",
            error: error.message
        });
    }
};