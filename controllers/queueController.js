const queues = require('../models/queuesModel');
const tables = require('../models/tableModel');
const mongoose = require('mongoose');
const pushSubscriptions = require('../models/pushSubscriptionModel');
const webpush = require('../config/webPush');

// CUSTOMER CHECK-IN CONTROLLER
exports.checkInController = async (req, res) => {
    console.log("inside checkInController");

    try {
        // 1. Receive customer details from req.body
        const customerName = req.body.customerName || req.body.name;
        const { phone, guests } = req.body;

        // 2. Validate the information
        if (!customerName || !customerName.trim()) {
            return res.status(400).json({
                message: "Customer name is required"
            });
        }

        if (!phone || !phone.toString().trim()) {
            return res.status(400).json({
                message: "Phone number is required"
            });
        }

        const parsedGuests = Number(guests);
        if (!Number.isInteger(parsedGuests) || parsedGuests < 1) {
            return res.status(400).json({
                message: "Number of guests must be at least 1"
            });
        }

        // 3. Generate a unique token exclusively on the backend (do not accept from frontend)
        const token = `SF-${Date.now().toString().slice(-6)}`;

        // 4. Create a queue document
        const newQueue = await queues.create({
            customerName: customerName.trim(),
            phone: phone.toString().trim(),
            guests: parsedGuests,
            token: token,
            status: "Waiting",
            joinedAt: new Date()
        });

        // 5. Return the saved queue information
        return res.status(201).json({
            success: true,
            message: "Customer checked in successfully",
            queue: newQueue
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Customer check-in failed",
            error: error.message
        });
    }
};

// Alias for customerCheckInController
exports.customerCheckInController = exports.checkInController;

// GET ALL QUEUE ENTRIES (Admin and Staff)
// GET ALL QUEUE ENTRIES (Admin and Staff)
exports.getAllQueueController = async (req, res) => {
    console.log("inside getAllQueueController");

    try {
        const { status, date } = req.query;

        // Get today's date in India timezone
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata"
        }).format(new Date());

        // If date is not provided, use today's date
        const selectedDate = date || today;

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Use YYYY-MM-DD"
            });
        }

        // Extract year, month and day
        const [year, month, day] = selectedDate.split("-").map(Number);

        // Validate actual calendar date
        const dateCheck = new Date(Date.UTC(year, month - 1, day));

        if (
            dateCheck.getUTCFullYear() !== year ||
            dateCheck.getUTCMonth() !== month - 1 ||
            dateCheck.getUTCDate() !== day
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid date"
            });
        }

        // Start of selected day (India timezone)
        const startDate = new Date(
            `${selectedDate}T00:00:00+05:30`
        );

        // Calculate the next day
        const nextDay = new Date(
            Date.UTC(year, month - 1, day + 1)
        ).toISOString().slice(0, 10);

        // Start of next day (exclusive)
        const endDate = new Date(
            `${nextDay}T00:00:00+05:30`
        );

        // Build MongoDB filter
        const filter = {
            joinedAt: {
                $gte: startDate,
                $lt: endDate
            }
        };

        // Optional status filter
        if (status) {
            filter.status = {
                $regex: new RegExp(`^${status}$`, "i")
            };
        }

        // Fetch customers in FIFO order
        const allQueue = await queues
            .find(filter)
            .sort({ joinedAt: 1 })
            .populate("assignedTable");

        return res.status(200).json(allQueue);

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch queue entries",
            error: error.message
        });
    }
};

// Alias for flexibility
exports.getQueueController = exports.getAllQueueController;

// FIFO AUTOMATIC TABLE ASSIGNMENT CONTROLLER (Admin and Staff)
// FIFO AUTOMATIC TABLE ASSIGNMENT + WEB PUSH NOTIFICATION
exports.assignTableController = async (req, res) => {
    console.log("inside assignTableController");

    try {
        const { tableId, queueId } = req.body;

        // 1. Find available tables
        let availableTables = [];

        if (tableId) {
            const table = mongoose.Types.ObjectId.isValid(tableId)
                ? await tables.findOne({
                    _id: tableId,
                    status: "Available"
                })
                : await tables.findOne({
                    tableNumber: Number(tableId),
                    status: "Available"
                });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Specified table is not available or does not exist"
                });
            }

            availableTables = [table];

        } else {
            availableTables = await tables.find({
                status: "Available"
            }).sort({ capacity: 1, tableNumber: 1 });

            if (availableTables.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No available tables found"
                });
            }
        }

        // 2. Find waiting customers in FIFO order
        let waitingCustomers = [];

        if (queueId) {
            const customer = await queues.findOne({
                _id: queueId,
                status: "Waiting"
            });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Specified customer is not in waiting queue"
                });
            }

            waitingCustomers = [customer];

        } else {
            waitingCustomers = await queues.find({
                status: "Waiting"
            }).sort({ joinedAt: 1 });

            if (waitingCustomers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No waiting customers in the queue"
                });
            }
        }

        // 3. Find the earliest customer who fits an available table
        let selectedCustomer = null;
        let selectedTable = null;

        for (const customer of waitingCustomers) {

            const fitTable = availableTables.find(
                table => table.capacity >= customer.guests
            );

            if (fitTable) {
                selectedCustomer = customer;
                selectedTable = fitTable;
                break;
            }
        }

        if (!selectedCustomer || !selectedTable) {
            return res.status(400).json({
                success: false,
                message: "No waiting customer fits the capacity of currently available tables"
            });
        }

        // 4. Lock the selected table
        const lockedTable = await tables.findOneAndUpdate(
            {
                _id: selectedTable._id,
                status: "Available"
            },
            {
                status: "Occupied"
            },
            {
                new: true
            }
        );

        if (!lockedTable) {
            return res.status(409).json({
                success: false,
                message: "Table was assigned concurrently by another transaction, please retry"
            });
        }

        // 5. Update queue status and assign table
        const updatedQueue = await queues.findOneAndUpdate(
            {
                _id: selectedCustomer._id,
                status: "Waiting"
            },
            {
                status: "Assigned",
                assignedTable: lockedTable._id
            },
            {
                new: true
            }
        ).populate("assignedTable");

        // Rollback table if customer was modified concurrently
        if (!updatedQueue) {

            await tables.findByIdAndUpdate(
                lockedTable._id,
                { status: "Available" }
            );

            return res.status(409).json({
                success: false,
                message: "Customer status was updated concurrently by another transaction, please retry"
            });
        }

        const subscription = await pushSubscriptions.findOne({
            queue: updatedQueue._id
        });

        if (subscription) {

            const payload = JSON.stringify({
                title: "Your table is ready!",
                body: `Hello ${updatedQueue.customerName}, Table ${lockedTable.tableNumber} has been assigned to you. Please proceed to your table.`,
                url: `/customer/queue-status/${encodeURIComponent(updatedQueue.token)}`
            });

            try {

                await webpush.sendNotification(
                    subscription,
                    payload
                );

                console.log("Push notification sent successfully");

            } catch (error) {

                console.error("Push notification failed:", error);

                if (error.statusCode === 404 || error.statusCode === 410) {
                    await pushSubscriptions.findByIdAndDelete(subscription._id);
                }

            }
        }
        // 6. Send Web Push notification
        let notificationSent = false;

        try {

            const customerSubscription = await pushSubscriptions.findOne({
                queue: updatedQueue._id
            });

            if (customerSubscription) {

                const payload = JSON.stringify({
                    title: "Your table is ready!",
                    body: `Hello ${updatedQueue.customerName}, Table ${lockedTable.tableNumber} has been assigned to you. Please proceed to your table.`,
                    url: "/customer/queue"
                });

                const subscription = {
                    endpoint: customerSubscription.endpoint,
                    expirationTime: customerSubscription.expirationTime,
                    keys: customerSubscription.keys
                };

                try {

                    await webpush.sendNotification(
                        subscription,
                        payload
                    );

                    notificationSent = true;

                    console.log(
                        `Push notification sent to ${updatedQueue.token}`
                    );

                } catch (pushError) {

                    console.error(
                        "Push notification failed:",
                        pushError
                    );

                    // Remove expired or invalid subscriptions
                    if (
                        pushError.statusCode === 404 ||
                        pushError.statusCode === 410
                    ) {
                        await pushSubscriptions.findByIdAndDelete(
                            customerSubscription._id
                        );

                        console.log("Expired push subscription removed");
                    }
                }

            } else {

                console.log(
                    "Customer has not enabled push notifications"
                );

            }

        } catch (notificationError) {

            // Notification failure must not undo a successful assignment
            console.error(
                "Notification processing failed:",
                notificationError
            );
        }

        // 7. Return assignment information
        return res.status(200).json({
            success: true,
            message: `Table ${lockedTable.tableNumber} successfully assigned to ${updatedQueue.customerName}`,
            notificationSent,
            assignment: {
                queue: updatedQueue,
                table: lockedTable
            }
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Automatic table assignment failed",
            error: error.message
        });
    }
};



// UPDATE QUEUE STATUS CONTROLLER (Staff and Admin)
exports.updateQueueStatusController = async (req, res) => {
    console.log("inside updateQueueStatusController");

    const id = req.params.id || req.body.queueId || req.body.id;
    const { status } = req.body;

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Queue ID is required"
            });
        }

        const allowedStatuses = ["Waiting", "Assigned", "Seated", "Completed", "Cancelled"];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Valid status is required. Allowed values: ${allowedStatuses.join(", ")}`
            });
        }

        const queueEntry = await queues.findById(id);
        if (!queueEntry) {
            return res.status(404).json({
                success: false,
                message: "Queue entry not found"
            });
        }

        const currentStatus = queueEntry.status;
        const newStatus = status;

        // Prevent updating already terminal statuses
        if (currentStatus === "Completed" || currentStatus === "Cancelled") {
            return res.status(400).json({
                success: false,
                message: `Cannot update a visit that is already ${currentStatus}`
            });
        }

        // Validate allowed progression
        // Waiting -> Cancelled
        // Assigned -> Seated
        // Assigned -> Cancelled
        // Seated -> Completed
        const validTransitions = {
            Waiting: ["Cancelled", "Assigned"],
            Assigned: ["Seated", "Cancelled"],
            Seated: ["Completed", "Cancelled"]
        };

        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
            });
        }

        // Handle Table state updates according to queue status progression
        if (queueEntry.assignedTable) {
            if (newStatus === "Completed" || newStatus === "Cancelled") {
                // Release table: Assigned -> Cancelled, or Seated -> Completed automatically makes table Available
                await tables.findByIdAndUpdate(queueEntry.assignedTable, { status: "Available" });
            } else if (newStatus === "Seated") {
                // Customer occupies the assigned table
                await tables.findByIdAndUpdate(queueEntry.assignedTable, { status: "Occupied" });
            }
        }

        // Update queue status
        queueEntry.status = newStatus;
        await queueEntry.save();
        await queueEntry.populate("assignedTable");

        return res.status(200).json({
            success: true,
            message: `Queue status successfully updated from ${currentStatus} to ${newStatus}`,
            queue: queueEntry
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update queue status",
            error: error.message
        });
    }
};

// Alias for flexibility
exports.changeQueueStatusController = exports.updateQueueStatusController;

// GET CUSTOMER QUEUE STATUS BY TOKEN (Public - customer facing)
exports.getCustomerQueueStatusController = async (req, res) => {
    console.log("inside getCustomerQueueStatusController");

    // 1. Receive the customer's token through req.params
    const token = req.params.token?.trim();

    try {
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Customer token is required"
            });
        }

        // 2. Find the customer using queues.findOne(), with the assigned table populated (5)
        const queueEntry = await queues
            .findOne({ token })
            .populate("assignedTable");

        // 3. Return 404 if the token doesn't exist
        if (!queueEntry) {
            return res.status(404).json({
                success: false,
                message: "No queue entry found for the provided token"
            });
        }

        // 4. Calculate how many waiting customers are ahead (FIFO)
        // A customer only has a position while they are still waiting.
        let waitingAhead = 0;
        let position = null;

        if (queueEntry.status === "Waiting") {
            // Earlier joinedAt => ahead in the queue.
            // _id is used as a tie-breaker so entries sharing the exact same
            // timestamp still get a stable, unique ordering.
            waitingAhead = await queues.countDocuments({
                status: "Waiting",
                $or: [
                    { joinedAt: { $lt: queueEntry.joinedAt } },
                    {
                        joinedAt: queueEntry.joinedAt,
                        _id: { $lt: queueEntry._id }
                    }
                ]
            });

            position = waitingAhead + 1;
        }

        // 6. Return the queue information
        return res.status(200).json({
            success: true,
            message: "Queue status fetched successfully",
            queue: queueEntry,
            waitingAhead,
            position
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer queue status",
            error: error.message
        });
    }
};
