const express = require("express");

const verifyToken = require("../middleware/authMiddleware");
const customerAuthMiddleware = require("../middleware/customerAuthMiddleware");

const {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  createMobileContact,
  getMyMobileContacts,
  getMyUnreadQueryNotificationCount,
  markMyQueryNotificationRead,
  getAdminQueryNotifications,
  markAdminQueryNotificationRead,
} = require("../controllers/contactController");

const router = express.Router();

// Submit contact form
router.post("/", createContact);

// Get one contact message by ID
router.get("/:id", verifyToken, getContactById);

// Submit contact message from authenticated mobile customer
router.post("/mobile", customerAuthMiddleware, createMobileContact);

// Get all contact messages
router.get("/", verifyToken, getContacts);

// Get unread pending notifications for the admin popup
router.get(
  "/admin/notifications",
  verifyToken,
  getAdminQueryNotifications,
);

router.patch(
  "/:id/admin-notification/read",
  verifyToken,
  markAdminQueryNotificationRead,
);

// Mark contact message as completed
router.patch("/:id/status", verifyToken, updateContactStatus);

// Reply to a customer contact message
router.patch("/:id/reply", verifyToken, replyToContact);

// Get contact messages for authenticated mobile customer
router.get("/mobile/my-messages", customerAuthMiddleware, getMyMobileContacts);

// Get unread admin-reply notification count for mobile customer
router.get(
  "/mobile/notifications/unread-count",
  customerAuthMiddleware,
  getMyUnreadQueryNotificationCount,
);

// Mark a query notification as read
router.patch(
  "/mobile/notifications/:id/read",
  customerAuthMiddleware,
  markMyQueryNotificationRead,
);
module.exports = router;
