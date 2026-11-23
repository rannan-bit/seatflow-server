const pushSubscriptions = require("../models/pushSubscriptionModel");
const queues = require("../models/queuesModel");

exports.savePushSubscriptionController = async (req, res) => {
    try {
        const { token, subscription } = req.body;

        if (
            !token ||
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid subscription data"
            });
        }

        const queue = await queues.findOne({ token });

        if (!queue) {
            return res.status(404).json({
                success: false,
                message: "Queue entry not found"
            });
        }

        await pushSubscriptions.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                queue: queue._id,
                endpoint: subscription.endpoint,
                expirationTime: subscription.expirationTime,
                keys: subscription.keys
            },
            {
                upsert: true,
                new: true
            }
        );

        res.status(200).json({
            success: true,
            message: "Push subscription saved"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};