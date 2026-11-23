const orders = require('../models/orderModel');
const foods = require('../models/foodsModel');
const queues = require('../models/queuesModel');
const mongoose = require('mongoose');

// GST applied on top of the item subtotal
const TAX_RATE = 0.05

// Keep money values to 2 decimal places
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Served", "Cancelled"]
const PAYMENT_STATUSES = ["Unpaid", "Paid"]

// Allowed order status progression (terminal statuses cannot change)
const VALID_TRANSITIONS = {
    Pending: ["Preparing", "Cancelled"],
    Preparing: ["Ready", "Cancelled"],
    Ready: ["Served", "Cancelled"],
    Served: [],
    Cancelled: []
}

// 1. CREATE ORDER (customer, identified by their queue token)
exports.createOrderController = async (req, res) => {
    console.log("inside createOrderController");

    try {
        const { items, token, queueToken, queueId } = req.body;

        // 1. Validate the item list
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one order item is required"
            });
        }

        // 2. Resolve the customer's queue entry (token preferred, id supported)
        const customerToken = (token || queueToken || "").toString().trim();

        let queueEntry = null;
        if (customerToken) {
            queueEntry = await queues.findOne({ token: customerToken });
        }
        else if (queueId && mongoose.Types.ObjectId.isValid(queueId)) {
            queueEntry = await queues.findById(queueId);
        }

        if (!queueEntry) {
            return res.status(404).json({
                success: false,
                message: "Queue entry not found. Please check in before ordering"
            });
        }

        // A closed visit can no longer place orders
        if (queueEntry.status !== "Seated") {
            return res.status(400).json({
                success: false,
                message: "You can place an order only after being seated."
            });
        }

        // 3. Validate each line and merge duplicate food ids
        const requestedItems = new Map();

        for (const item of items) {
            const foodId = item?.food || item?.foodId || item?.id;
            const quantity = Number(item?.quantity);

            if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
                return res.status(400).json({
                    success: false,
                    message: "Each order item must reference a valid food id"
                });
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Each order item must have a quantity of at least 1"
                });
            }

            requestedItems.set(foodId, (requestedItems.get(foodId) || 0) + quantity);
        }

        // 4. Price the order from the database — never trust client-side prices
        const foodDocs = await foods.find({ _id: { $in: [...requestedItems.keys()] } });
        const foodById = new Map(foodDocs.map((food) => [food._id.toString(), food]));

        const orderItems = [];
        let subtotal = 0;

        for (const [foodId, quantity] of requestedItems) {
            const food = foodById.get(foodId);

            if (!food) {
                return res.status(400).json({
                    success: false,
                    message: `Food item ${foodId} does not exist`
                });
            }

            if (!food.available) {
                return res.status(400).json({
                    success: false,
                    message: `${food.name} is currently unavailable`
                });
            }

            orderItems.push({
                food: food._id,
                quantity,
                price: food.price
            });

            subtotal += food.price * quantity;
        }

        // 5. Calculate subtotal, tax and total on the backend
        subtotal = round2(subtotal);
        const tax = round2(subtotal * TAX_RATE);
        const totalAmount = round2(subtotal + tax);

        // 6. Save the order linked to the queue entry
        const newOrder = await orders.create({
            queue: queueEntry._id,
            items: orderItems,
            subtotal,
            tax,
            totalAmount,
            status: "Pending",
            paymentStatus: "Unpaid"
        });

        await newOrder.populate([
            { path: "queue" },
            { path: "items.food" }
        ]);

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: newOrder,
            totals: {
                subtotal,
                taxRate: `${TAX_RATE * 100}%`,
                tax,
                totalAmount
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to place order",
            error: error.message
        });
    }
};

// 2. GET CUSTOMER ORDERS (by queue token)
exports.getCustomerOrdersController = async (req, res) => {
    console.log("inside getCustomerOrdersController");

    const token = (req.params.token || req.query.token || "").toString().trim();

    try {
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Customer token is required"
            });
        }

        const queueEntry = await queues.findOne({ token });

        if (!queueEntry) {
            return res.status(404).json({
                success: false,
                message: "No queue entry found for the provided token"
            });
        }

        const customerOrders = await orders
            .find({ queue: queueEntry._id })
            .sort({ createdAt: -1 })
            .populate([
                { path: "queue" },
                { path: "items.food" }
            ]);

        return res.status(200).json({
            success: true,
            count: customerOrders.length,
            queueToken: queueEntry.token,
            orders: customerOrders
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer orders",
            error: error.message
        });
    }
};

// 3. GET ALL ORDERS (Staff and Admin)
// 3. GET ALL ORDERS (Staff and Admin)
exports.getAllOrdersController = async (req, res) => {
    console.log("inside getAllOrdersController");

    const { status, paymentStatus, date } = req.query;

    try {
        const filter = {};

        // Default to today's date in India timezone
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata"
        }).format(new Date());

        const selectedDate = date || today;

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Use YYYY-MM-DD"
            });
        }

        // Validate actual calendar date
        const [year, month, day] = selectedDate.split("-").map(Number);

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

        // Start of selected day in India timezone
        const startDate = new Date(
            `${selectedDate}T00:00:00+05:30`
        );

        // Calculate the next day
        const nextDay = new Date(
            Date.UTC(year, month - 1, day + 1)
        ).toISOString().slice(0, 10);

        const endDate = new Date(
            `${nextDay}T00:00:00+05:30`
        );

        // Filter orders by creation date
        filter.createdAt = {
            $gte: startDate,
            $lt: endDate
        };

        // Filter by order status
        if (status !== undefined) {
            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${ORDER_STATUSES.join(", ")}`
                });
            }

            filter.status = status;
        }

        // Filter by payment status
        if (paymentStatus !== undefined) {
            if (!PAYMENT_STATUSES.includes(paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment status. Allowed values: ${PAYMENT_STATUSES.join(", ")}`
                });
            }

            filter.paymentStatus = paymentStatus;
        }

        // Fetch orders
        const allOrders = await orders
            .find(filter)
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "queue",
                    select: "customerName phone guests token status assignedTable"
                },
                {
                    path: "items.food",
                    select: "name price category image"
                }
            ]);

        return res.status(200).json(allOrders);

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
};
// 4. UPDATE ORDER STATUS (Staff and Admin)
exports.updateOrderStatusController = async (req, res) => {
    console.log("inside updateOrderStatusController");

    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id"
            });
        }

        if (status === undefined && paymentStatus === undefined) {
            return res.status(400).json({
                success: false,
                message: "A status or paymentStatus value is required"
            });
        }

        const order = await orders.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (status !== undefined) {
            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${ORDER_STATUSES.join(", ")}`
                });
            }

            if (status !== order.status) {
                const allowedNext = VALID_TRANSITIONS[order.status] || [];

                if (!allowedNext.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid status transition from '${order.status}' to '${status}'`
                    });
                }

                order.status = status;
            }
        }

        if (paymentStatus !== undefined) {
            if (!PAYMENT_STATUSES.includes(paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment status. Allowed values: ${PAYMENT_STATUSES.join(", ")}`
                });
            }

            order.paymentStatus = paymentStatus;
        }

        await order.save();

        await order.populate([
            { path: "queue", select: "customerName phone guests token status assignedTable" },
            { path: "items.food", select: "name price category image" }
        ]);

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${order.status}`,
            order
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: error.message
        });
    }
};
