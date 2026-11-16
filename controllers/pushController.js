const pushSubscriptions = require("../models/pushSubscriptionModel");
const queues = require("../models/queuesModel");

// Save customer push subscription
exports.savePushSubscriptionController = async (req, res) => {
    try {
        const { token, subscription } = req.body;

        // Validate input
        if (!token || !subscription) {
            return res.status(400).json({
                success: false,
                message: "Queue token and push subscription are required"
            });
        }

        const { endpoint, expirationTime, keys } = subscription;

        if (
            !endpoint ||
            !keys?.p256dh ||
            !keys?.auth
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid push subscription"
            });
        }

        // Find customer queue entry
        const queueEntry = await queues.findOne({ token });

        if (!queueEntry) {
            return res.status(404).json({
                success: false,
                message: "Customer queue entry not found"
            });
        }

        // Save or update subscription
        const savedSubscription = await pushSubscriptions.findOneAndUpdate(
            { endpoint },
            {
                queue: queueEntry._id,
                endpoint,
                expirationTime,
                keys: {
                    p256dh: keys.p256dh,
                    auth: keys.auth
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Push subscription saved successfully",
            subscriptionId: savedSubscription._id
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Failed to save push subscription",
            error: error.message
        });
    }
};