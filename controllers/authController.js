const users = require('../models/usersModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


// CREATE STAFF ACCOUNT

exports.registerController = async (req, res) => {

    console.log("Inside staff registration logic");

    try {

        const { name, email, password } = req.body;

        // Step 1: Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Step 2: Check existing email
        const existingUser = await users.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Step 3: Hash password
        const encryptedPassword = await bcrypt.hash(password, 10);

        // Step 4: Create staff account
        const newUser = await users.create({
            name,
            email,
            password: encryptedPassword,
            role: "staff"
        });

        // Step 5: Send response
        return res.status(201).json({
            success: true,
            message: "Staff account created successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });

    }

};

// LOGIN CONTROLLER
exports.loginController = async (req, res) => {

    const { email, password } = req.body;

    try {

        // Step 1: Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Step 2: Find user by email
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Step 3: Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Step 4: Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                userEmail: user.email,
                role: user.role
            },
            process.env.JWTSECRET
        );

        // Step 5: Send response
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }

};

// GET ALL STAFF ACCOUNTS (Admin)
exports.getAllStaffController = async (req, res) => {

    console.log("Inside get all staff logic");

    try {

        // Only staff accounts are listed here, never admins
        const staffAccounts = await users
            .find({ role: "staff" })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json(staffAccounts);

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch staff accounts"
        });

    }

};

// UPDATE STAFF ACCOUNT (Admin)
exports.updateStaffController = async (req, res) => {

    console.log("Inside update staff logic");

    const { id } = req.params;
    const { name, email, password } = req.body;

    try {

        // Step 1: Validate the staff id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid staff id"
            });
        }

        // Step 2: Only staff accounts can be edited
        const staffMember = await users.findOne({ _id: id, role: "staff" });

        if (!staffMember) {
            return res.status(404).json({
                message: "Staff member not found"
            });
        }

        const updateData = {};

        // Step 3: Validate and prepare the fields that were sent
        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({
                    message: "Name cannot be empty"
                });
            }
            updateData.name = String(name).trim();
        }

        if (email !== undefined) {
            const normalizedEmail = String(email).toLowerCase().trim();

            if (!normalizedEmail) {
                return res.status(400).json({
                    message: "Email cannot be empty"
                });
            }

            // Step 4: Email must stay unique
            const duplicate = await users.findOne({
                email: normalizedEmail,
                _id: { $ne: id }
            });

            if (duplicate) {
                return res.status(400).json({
                    message: "Email is already in use"
                });
            }

            updateData.email = normalizedEmail;
        }

        // Step 5: Hash the new password only when one was provided
        if (password) {
            updateData.password = await bcrypt.hash(String(password), 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "Nothing to update"
            });
        }

        const updatedStaff = await users
            .findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true })
            .select("-password");

        return res.status(200).json({
            success: true,
            message: "Staff account updated successfully",
            user: {
                id: updatedStaff._id,
                name: updatedStaff.name,
                email: updatedStaff.email,
                role: updatedStaff.role
            }
        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update staff account"
        });

    }

};

// DELETE STAFF ACCOUNT (Admin)
exports.deleteStaffController = async (req, res) => {

    console.log("Inside delete staff logic");

    const { id } = req.params;

    try {

        // Step 1: Validate the staff id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid staff id"
            });
        }

        // Step 2: Only staff accounts can be deleted, admins are protected
        const deletedStaff = await users.findOneAndDelete({ _id: id, role: "staff" });

        if (!deletedStaff) {
            return res.status(404).json({
                message: "Staff member not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Staff account deleted successfully",
            user: {
                id: deletedStaff._id,
                name: deletedStaff.name,
                email: deletedStaff.email,
                role: deletedStaff.role
            }
        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete staff account"
        });

    }

};