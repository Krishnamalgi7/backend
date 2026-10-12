const express = require("express");

const verifyToken = require("../middleware/authMiddleware");

const {
  createContact,
  getContacts,
   updateContactStatus,
} = require("../controllers/contactController");

const router = express.Router();

// Submit contact form
router.post("/", createContact);

// Get all contact messages
router.get("/", verifyToken, getContacts);

// Mark contact message as completed
router.patch("/:id/status", verifyToken, updateContactStatus);

module.exports = router;
