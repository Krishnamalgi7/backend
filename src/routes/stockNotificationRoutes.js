
const express = require("express");
const router = express.Router();

const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const StockNotification = require("../models/StockNotification");

const {
  subscribeToStockNotification,
  getMyStockNotifications,
  getUnreadStockNotificationCount,
  markMyStockNotificationsRead,
  getAllStockNotifications,
} = require("../controllers/stockNotificationController");

router.post(
  "/subscribe",
  customerAuthMiddleware,
  subscribeToStockNotification,
);

router.get(
  "/my-notifications",
  customerAuthMiddleware,
  getMyStockNotifications,
);

router.get(
  "/unread-count",
  customerAuthMiddleware,
  getUnreadStockNotificationCount,
);

router.patch(
  "/my-notifications/read",
  customerAuthMiddleware,
  markMyStockNotificationsRead,
);

router.get("/admin/all", authMiddleware, getAllStockNotifications);

module.exports = router;
