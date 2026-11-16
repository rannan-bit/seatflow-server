const tables = require('../models/tableModel');
const mongoose = require('mongoose');

// 1. ADD TABLE (Admin)
exports.addTableController = async (req, res) => {
    console.log("inside addTableController");

    const { tableNumber, capacity, status } = req.body;

    try {
        if (!Number.isFinite(Number(capacity)) || Number(capacity) < 1) {
            return res.status(400).json({
                message: "Valid seating capacity (minimum 1) is required"
            });
        }

        let finalTableNumber = Number(tableNumber);

        // Auto-assign next tableNumber if not provided
        if (tableNumber === undefined || tableNumber === "" || tableNumber === null) {
            const lastTable = await tables.findOne().sort({ tableNumber: -1 });
            finalTableNumber = lastTable ? lastTable.tableNumber + 1 : 1;
        } else if (!Number.isInteger(finalTableNumber) || finalTableNumber < 1) {
            return res.status(400).json({
                message: "Table number must be a whole number of at least 1"
            });
        } else {
            // Check if tableNumber is already taken
            const existingTable = await tables.findOne({ tableNumber: finalTableNumber });
            if (existingTable) {
                return res.status(400).json({
                    message: `Table number ${finalTableNumber} already exists`
                });
            }
        }

        const allowedStatuses = ["Available", "Occupied", "Reserved"];
        const finalStatus = status || "Available";

        if (!allowedStatuses.includes(finalStatus)) {
            return res.status(400).json({
                message: "Invalid status. Must be Available, Occupied, or Reserved"
            });
        }

        const newTable = await tables.create({
            tableNumber: finalTableNumber,
            capacity: Number(capacity),
            status: finalStatus
        });

        return res.status(201).json({
            message: "Table added successfully",
            table: newTable
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to add table",
            error: error.message
        });
    }
};

// 2. GET ALL TABLES (Admin, Staff)
exports.getAllTablesController = async (req, res) => {
    console.log("inside getAllTablesController");

    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        const allTables = await tables.find(query).sort({ tableNumber: 1 });
        return res.status(200).json(allTables);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch tables",
            error: error.message
        });
    }
};

// 3. GET SINGLE TABLE (Admin, Staff)
exports.getSingleTableController = async (req, res) => {
    console.log("inside getSingleTableController");

    const { id } = req.params;

    try {
        const table = mongoose.Types.ObjectId.isValid(id)
            ? await tables.findById(id)
            : await tables.findOne({ tableNumber: Number(id) });

        if (!table) {
            return res.status(404).json({
                message: "Table not found"
            });
        }

        return res.status(200).json(table);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch table",
            error: error.message
        });
    }
};

// 4. UPDATE TABLE (Admin)
exports.updateTableController = async (req, res) => {
    console.log("inside updateTableController");

    const { id } = req.params;
    const { tableNumber, capacity, status } = req.body;

    try {
        const updateData = {};

        if (capacity !== undefined) {
            const parsedCapacity = Number(capacity);

            if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
                return res.status(400).json({
                    message: "Valid seating capacity (minimum 1) is required"
                });
            }
            updateData.capacity = parsedCapacity;
        }

        if (status !== undefined) {
            const allowedStatuses = ["Available", "Occupied", "Reserved"];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status. Must be Available, Occupied, or Reserved"
                });
            }
            updateData.status = status;
        }

        if (tableNumber !== undefined) {
            const parsedTableNumber = Number(tableNumber);

            if (!Number.isInteger(parsedTableNumber) || parsedTableNumber < 1) {
                return res.status(400).json({
                    message: "Table number must be a whole number of at least 1"
                });
            }

            // Check if tableNumber is already used by another table
            const existingTable = await tables.findOne({
                tableNumber: parsedTableNumber,
                _id: { $ne: id }
            });

            if (existingTable) {
                return res.status(400).json({
                    message: `Table number ${parsedTableNumber} already exists`
                });
            }
            updateData.tableNumber = parsedTableNumber;
        }

        const updatedTable = await tables.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: "after", runValidators: true }
        );

        if (!updatedTable) {
            return res.status(404).json({
                message: "Table not found"
            });
        }

        return res.status(200).json({
            message: "Table updated successfully",
            table: updatedTable
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update table",
            error: error.message
        });
    }
};

// 5. DELETE TABLE (Admin)
exports.deleteTableController = async (req, res) => {
    console.log("inside deleteTableController");

    const { id } = req.params;

    try {
        // Look the table up first so an occupied table is never deleted.
        const table = await tables.findById(id);

        if (!table) {
            return res.status(404).json({
                message: "Table not found"
            });
        }

        if (table.status === "Occupied") {
            return res.status(400).json({
                message: "Cannot delete an occupied table"
            });
        }

        await table.deleteOne();

        return res.status(200).json({
            message: "Table deleted successfully",
            table
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to delete table",
            error: error.message
        });
    }
};

// 6. CHANGE TABLE STATUS (Admin, Staff)
exports.changeTableStatusController = async (req, res) => {
    console.log("inside changeTableStatusController");

    const { id } = req.params;
    const { status } = req.body;

    try {
        const table = await tables.findById(id);

        if (!table) {
            return res.status(404).json({
                message: "Table not found"
            });
        }

        const allowedStatuses = ["Available", "Occupied", "Reserved"];
        const STATUS_CYCLE = {
            Available: "Occupied",
            Occupied: "Reserved",
            Reserved: "Available"
        };

        let newStatus;
        if (status) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status. Must be Available, Occupied, or Reserved"
                });
            }
            newStatus = status;
        } else {
            // Toggle/cycle through statuses if not explicitly specified
            newStatus = STATUS_CYCLE[table.status] || "Available";
        }

        table.status = newStatus;
        await table.save();

        return res.status(200).json({
            message: `Table status updated to ${newStatus}`,
            table
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update table status",
            error: error.message
        });
    }
};
