
const mongoose = require("mongoose");
const StockNotification = require("../models/StockNotification");
const Phone = require("../models/Phone");

// Customer subscribes to a phone that is out of stock
const subscribeToStockNotification = async (req, res) => {
  try {
    const { phoneId } = req.body;
    const customerId = req.customer.customerId;

    if (!mongoose.Types.ObjectId.isValid(phoneId)) {
      return res.status(400).json({
        message: "Invalid phone ID",
      });
    }

    const phone = await Phone.findById(phoneId);

    if (!phone) {
      return res.status(404).json({
        message: "Phone not found",
      });
    }

    if (phone.quantity > 0) {
      return res.status(400).json({
        message: "This phone is already available",
      });
    }

    const existingRequest = await StockNotification.findOne({
      customerId,
      phoneId,
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(200).json({
          message: "You are already subscribed to this phone",
          notification: existingRequest,
        });
      }

      return res.status(409).json({
        message: "A request already exists for this phone",
      });
    }

    const notification = await StockNotification.create({
      customerId,
      phoneId,
    });

    return res.status(201).json({
      message: "We will notify you when this phone is available",
      notification,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A request already exists for this phone",
      });
    }

    console.error("Stock notification subscription error:", error);

    return res.status(500).json({
      message: "Failed to subscribe to stock notification",
    });
  }
};


const getMyStockNotifications = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const notifications = await StockNotification.find({
      customerId,
    })
      .populate("phoneId", "name image imageUrl price totalPrice quantity")
      .sort({ updatedAt: -1 });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Failed to fetch stock notifications:", error);

    return res.status(500).json({
      message: "Failed to fetch stock notifications",
    });
  }
};


const getAllStockNotifications = async (req, res) => {
  try {
    const notifications = await StockNotification.find()
      .populate("customerId")
      .populate("phoneId", "name image imageUrl price totalPrice quantity")
      .sort({ createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Failed to fetch all stock notifications:", error);

    return res.status(500).json({
      message: "Failed to fetch stock notification requests",
    });
  }
};


const getUnreadStockNotificationCount = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    const unreadCount = await StockNotification.countDocuments({
      customerId,
      status: "notified",
      readAt: null,
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Failed to fetch unread notification count:", error);

    return res.status(500).json({
      message: "Failed to fetch unread notification count",
    });
  }
};


const markMyStockNotificationsRead = async (req, res) => {
  try {
    const customerId = req.customer.customerId;

    await StockNotification.updateMany(
      {
        customerId,
        status: "notified",
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return res.status(200).json({
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark stock notifications read error:", error);
    return res.status(500).json({
      message: "Failed to mark notifications as read",
    });
  }
};

module.exports = {
  subscribeToStockNotification,
  getMyStockNotifications,
  getAllStockNotifications,
  getUnreadStockNotificationCount,
  markMyStockNotificationsRead,
};
